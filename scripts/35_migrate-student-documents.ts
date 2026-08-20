/**
 * Data Migration: import the legacy student file dump into student_documents.
 *
 * Usage:
 *   npx tsx scripts/35_migrate-student-documents.ts --pilot --dry-run
 *   npx tsx scripts/35_migrate-student-documents.ts --pilot
 *   npx tsx scripts/35_migrate-student-documents.ts --dry-run
 *   npx tsx scripts/35_migrate-student-documents.ts
 *
 * Requires SUPABASE_SECRET_KEY (sb_secret_...) to write; --dry-run needs none.
 *
 * --pilot selects a small set of students chosen for category coverage rather
 * than at random, so every document type and edge case gets exercised before
 * the full 39 GB run.
 *
 * Idempotent and resumable: storage paths are derived from the legacy folder id
 * and filename, so a re-run skips anything already uploaded at the same size and
 * picks up where it stopped. Safe to interrupt.
 *
 * Excluded: archived versions, profile photos (see 36_backfill-student-photos),
 * files over the bucket limit, and zero-byte files.
 */

import * as fs from 'fs'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { buildManifest, type ManifestRow } from './build-student-document-manifest'
import { buildDocumentPath } from '../src/lib/supabase/storage-paths'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const PILOT = args.includes('--pilot')
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const LIMIT = args.includes('--limit') ? parseInt(argValue('--limit', '0'), 10) : null

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const READ_KEY = SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const BUCKET = 'student-documents'
const CONCURRENCY = args.includes('--concurrency')
  ? parseInt(argValue('--concurrency', '12'), 10)
  : 12
const MAX_BYTES = 50 * 1024 * 1024          // bucket limit
const PILOT_MAX_BYTES = 5 * 1024 * 1024     // keep the pilot fast and cheap
const PILOT_STUDENTS = 25
const PILOT_MIN_PER_CATEGORY = 3

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
}

type Job = ManifestRow & { filePath: string }

type Skip = { file: string; reason: string }
const skipped: Skip[] = []
const stats = { imported: 0, updated: 0, failed: 0 }

async function main() {
  if (!SUPABASE_URL || !READ_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / Supabase key in .env.local')
    process.exit(1)
  }
  if (!DRY_RUN && !SECRET_KEY) {
    console.error('A Supabase secret key is required to write.\n')
    console.error('  Add to .env.local:\n    SUPABASE_SECRET_KEY=sb_secret_...\n')
    console.error('  Dashboard > Project Settings > API Keys > Secret keys.')
    console.error('\nRe-run with --dry-run to validate mapping and paths without it.')
    process.exit(1)
  }
  if (DRY_RUN) console.log('DRY RUN — nothing will be uploaded or written')
  if (PILOT) console.log(`PILOT — coverage-selected subset, files capped at ${PILOT_MAX_BYTES / 1024 ** 2} MB\n`)

  const supabase = createClient(SUPABASE_URL, READ_KEY, { auth: { persistSession: false } })

  console.log('Scanning source tree...')
  const manifest = buildManifest()
  const [students, categories] = await Promise.all([
    loadStudents(supabase),
    loadCategories(supabase),
  ])
  assertLookupsResolved(students.size, categories.size)
  console.log(`Resolved ${students.size} students, ${categories.size} categories\n`)

  let rows = eligible(manifest, students)
  if (PILOT) rows = selectPilot(rows)
  if (LIMIT) rows = rows.slice(0, LIMIT)

  let jobs: Job[] = rows.map((row) => ({
    ...row,
    filePath: buildDocumentPath({
      ownerId: students.get(row.studentCode!)!,
      categoryCode: row.categoryCode,
      fileName: row.baseName,
      // Folder-unique, because the legacy numeric id is shared by the duplicate
      // folder pairs and would otherwise overwrite. See folderKey().
      disambiguator: row.folderKey,
    }),
  }))

  // Resume: anything already stored at the same size is done. Makes an
  // interrupted 39 GB run cheap to restart instead of re-uploading from zero.
  if (!DRY_RUN) {
    const done = await loadExisting(supabase)
    const before = jobs.length
    jobs = jobs.filter((j) => done.get(j.filePath) !== j.size)
    if (before !== jobs.length) {
      console.log(`Resuming — ${before - jobs.length} already imported, ${jobs.length} remaining\n`)
    }
  }

  console.log(`${jobs.length} documents to process across ` +
    `${new Set(jobs.map((j) => j.studentCode)).size} students`)

  // Coverage matters more than volume for a pilot — show it before uploading.
  const coverage: Record<string, number> = {}
  for (const j of jobs) coverage[j.categoryCode] = (coverage[j.categoryCode] ?? 0) + 1
  console.log('  coverage: ' + Object.entries(coverage).sort()
    .map(([c, n]) => `${c}=${n}`).join('  ') + '\n')

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    await Promise.all(
      jobs.slice(i, i + CONCURRENCY).map((job) => processFile(supabase, job, students, categories))
    )
    process.stdout.write(`\r  processed ${Math.min(i + CONCURRENCY, jobs.length)}/${jobs.length}`)
  }
  console.log('\n')
  report(jobs.length)
}

/** Filter the manifest down to rows that can and should be uploaded. */
function eligible(manifest: ManifestRow[], students: Map<string, string>): ManifestRow[] {
  const out: ManifestRow[] = []
  for (const row of manifest) {
    if (row.archived) continue                        // superseded
    if (row.isPhoto) continue                         // handled by 36_backfill-student-photos
    if (!row.studentCode) {
      skipped.push({ file: row.fileName, reason: `folder ${row.folder} has no student code` })
      continue
    }
    if (!students.has(row.studentCode)) {
      skipped.push({ file: row.fileName, reason: `no student with code ${row.studentCode}` })
      continue
    }
    if (row.size === 0) { skipped.push({ file: row.fileName, reason: 'zero bytes' }); continue }
    const cap = PILOT ? PILOT_MAX_BYTES : MAX_BYTES
    if (row.size > cap) {
      skipped.push({ file: row.fileName, reason: `${(row.size / 1024 ** 2).toFixed(0)} MB exceeds ${cap / 1024 ** 2} MB cap` })
      continue
    }
    out.push(row)
  }
  return out
}

/**
 * Picks students for breadth rather than at random: first those holding the
 * most distinct document types, then tops up any category that would otherwise
 * be under-represented. Deterministic so a re-run selects the same set.
 */
function selectPilot(rows: ManifestRow[]): ManifestRow[] {
  const byStudent = new Map<string, ManifestRow[]>()
  for (const r of rows) {
    const list = byStudent.get(r.studentCode!) ?? []
    list.push(r)
    byStudent.set(r.studentCode!, list)
  }

  const ranked = [...byStudent.entries()]
    .map(([code, docs]) => ({ code, docs, variety: new Set(docs.map((d) => d.categoryCode)).size }))
    .sort((a, b) => b.variety - a.variety || b.docs.length - a.docs.length || a.code.localeCompare(b.code))

  const chosen = new Map<string, ManifestRow[]>()
  const counts: Record<string, number> = {}
  const add = (entry: { code: string; docs: ManifestRow[] }) => {
    if (chosen.has(entry.code)) return
    chosen.set(entry.code, entry.docs)
    for (const d of entry.docs) counts[d.categoryCode] = (counts[d.categoryCode] ?? 0) + 1
  }

  for (const entry of ranked.slice(0, PILOT_STUDENTS)) add(entry)

  // Thin categories (IELTS has only 121 files in total) can miss the top ranks
  // entirely, so top them up explicitly.
  const allCategories = new Set(rows.map((r) => r.categoryCode))
  for (const category of [...allCategories].sort()) {
    for (const entry of ranked) {
      if ((counts[category] ?? 0) >= PILOT_MIN_PER_CATEGORY) break
      if (entry.docs.some((d) => d.categoryCode === category)) add(entry)
    }
  }
  return [...chosen.values()].flat()
}

async function processFile(
  supabase: SupabaseClient,
  row: Job,
  students: Map<string, string>,
  categories: Map<string, number>
): Promise<void> {
  const studentId = students.get(row.studentCode!)!
  const filePath = row.filePath

  if (DRY_RUN) { stats.imported++; planned.push(`${row.categoryCode.padEnd(24)} ${filePath}`); return }

  try {
    const body = fs.readFileSync(row.fullPath)
    const contentType = MIME[row.extension] ?? 'application/octet-stream'

    const { error: uploadError } = await supabase.storage
      .from(BUCKET).upload(filePath, body, { contentType, upsert: true })
    if (uploadError) {
      stats.failed++
      skipped.push({ file: row.fileName, reason: `upload: ${uploadError.message}` })
      return
    }

    const record = {
      student_id: studentId,
      category_id: categories.get(row.categoryCode) ?? categories.get('other')!,
      file_name: row.baseName,
      file_path: filePath,
      file_size: body.length,
      mime_type: contentType,
      title: row.title,
    }

    // file_path is deterministic, so it doubles as the natural key on re-runs.
    const { data: existing } = await supabase
      .from('student_documents').select('id').eq('file_path', filePath).maybeSingle()

    const { error } = existing
      ? await supabase.from('student_documents').update(record).eq('id', existing.id)
      : await supabase.from('student_documents').insert(record)

    if (error) {
      stats.failed++
      skipped.push({ file: row.fileName, reason: `insert: ${error.message}` })
      // A client-side timeout does not mean the insert failed server-side.
      // Removing the object blindly can strand a committed row pointing at a
      // file that no longer exists, so confirm the row is really absent first.
      const { data: landed } = await supabase
        .from('student_documents').select('id').eq('file_path', filePath).maybeSingle()
      if (!landed) await supabase.storage.from(BUCKET).remove([filePath])
      return
    }
    if (existing) stats.updated++
    else stats.imported++
  } catch (err) {
    stats.failed++
    skipped.push({ file: row.fileName, reason: String(err) })
  }
}

const planned: string[] = []

/**
 * RLS is enabled on every table and policies apply to `authenticated` only, so
 * the publishable key now reads zero rows. Without this guard a run would
 * silently skip everything and still report success.
 */
function assertLookupsResolved(students: number, categories: number): void {
  if (students > 0 && categories > 0) return
  console.error('\nLookup tables came back empty — refusing to continue.')
  console.error(`  resolved: ${students} records, ${categories} categories`)
  console.error('\nRow Level Security applies to authenticated roles only, so the')
  console.error('publishable key reads nothing. Set SUPABASE_SECRET_KEY in .env.local.')
  process.exit(1)
}

async function loadStudents(supabase: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('students').select('id, student_code')
      .not('student_code', 'is', null).range(from, from + PAGE - 1)
    if (error) throw error
    for (const s of data ?? []) map.set(s.student_code, s.id)
    if (!data || data.length < PAGE) break
  }
  return map
}

/** file_path -> file_size for everything already imported. */
async function loadExisting(supabase: SupabaseClient): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('student_documents').select('file_path, file_size').range(from, from + PAGE - 1)
    if (error) throw error
    for (const d of data ?? []) map.set(d.file_path, d.file_size ?? -1)
    if (!data || data.length < PAGE) break
  }
  return map
}

async function loadCategories(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('document_categories').select('id, code')
  if (error) throw error
  return new Map((data ?? []).map((c) => [c.code, c.id]))
}

function report(attempted: number) {
  console.log('Result')
  console.log(`  documents imported   ${stats.imported}`)
  console.log(`  documents updated    ${stats.updated}  (re-run, no duplicates)`)
  console.log(`  skipped              ${skipped.length}`)
  console.log(`  failed               ${stats.failed}`)

  const handled = stats.imported + stats.updated + stats.failed
  console.log(`\n  reconciliation: ${handled} handled of ${attempted} attempted` +
    (handled === attempted ? '  OK' : '  MISMATCH — investigate'))

  if (DRY_RUN && planned.length) {
    console.log('\n  Sample planned paths:')
    for (const p of planned.slice(0, 6)) console.log(`    ${p}`)
  }
  if (skipped.length) {
    const byReason: Record<string, number> = {}
    for (const s of skipped) {
      const key = s.reason.replace(/\d+/g, 'N').replace(/S\N+|folder \S+/g, '…')
      byReason[key] = (byReason[key] ?? 0) + 1
    }
    console.log('\n  Skips by reason:')
    for (const [reason, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      console.log(`    ${String(n).padStart(5)}  ${reason}`)
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
