/**
 * Data Migration: import the legacy school file dump into school_documents.
 *
 * Usage:
 *   npx tsx scripts/37_migrate-school-documents.ts --dry-run
 *   npx tsx scripts/37_migrate-school-documents.ts --dry-run --limit 20
 *   npx tsx scripts/37_migrate-school-documents.ts
 *   npx tsx scripts/37_migrate-school-documents.ts --source school-files
 *
 * Requires SUPABASE_SECRET_KEY (sb_secret_...) in .env.local to write.
 * --dry-run needs no secret and validates mapping, classification and paths.
 *
 * Idempotent: storage paths are derived from the legacy school id + filename,
 * so re-running overwrites the same objects instead of creating duplicates.
 * Existing rows are matched on file_path and updated rather than re-inserted.
 *
 * Archived (.old) files are skipped — they are superseded by a live file in the
 * same folder. Branding assets (Logo/Campus/Map) are written to the school
 * record instead of the document list.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { parseSchoolFile } from './school-document-classifier'
import { buildDocumentPath } from '../src/lib/supabase/storage-paths'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const SOURCE = path.resolve(process.cwd(), argValue('--source', 'school-files'))
const LIMIT = args.includes('--limit') ? parseInt(argValue('--limit', '0'), 10) : null

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Writes need a full-privilege key: RLS restricts school_documents to
// authenticated roles, and storage uploads need the same.
// Prefer the current secret key (sb_secret_...); SUPABASE_SERVICE_ROLE_KEY is
// the legacy JWT equivalent, supported until Supabase retires it end of 2026.
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
// A dry run only reads, so it falls back to the publishable key.
const READ_KEY = SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const BUCKET = 'school-documents'
const CONCURRENCY = args.includes('--concurrency')
  ? parseInt(argValue('--concurrency', '12'), 10)
  : 12

/** Storage rejects unknown types; sniffed per file since archived names lose their extension. */
const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  msg: 'application/vnd.ms-outlook',
  txt: 'text/plain',
}

type Skip = { file: string; reason: string }
const skipped: Skip[] = []
const plannedDocs: string[] = []
const plannedMedia: string[] = []
const stats = { uploaded: 0, updated: 0, media: 0, skipped: 0, failed: 0 }

async function main() {
  if (!SUPABASE_URL || !READ_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / Supabase key in .env.local')
    process.exit(1)
  }
  if (!DRY_RUN && !SECRET_KEY) {
    console.error('A Supabase secret key is required to write.')
    console.error('')
    console.error('  Add to .env.local:')
    console.error('    SUPABASE_SECRET_KEY=sb_secret_...')
    console.error('')
    console.error('  Dashboard > Project Settings > API Keys > Secret keys.')
    console.error('  (SUPABASE_SERVICE_ROLE_KEY, the legacy JWT key, also works.)')
    console.error('')
    console.error('Re-run with --dry-run to validate mapping and paths without it.')
    process.exit(1)
  }
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source directory not found: ${SOURCE}`)
    process.exit(1)
  }
  if (DRY_RUN) console.log('DRY RUN — nothing will be uploaded or written\n')

  const supabase = createClient(SUPABASE_URL, READ_KEY, {
    auth: { persistSession: false },
  })

  const [schools, categories] = await Promise.all([
    loadSchools(supabase),
    loadCategories(supabase),
  ])
  assertLookupsResolved(schools.size, categories.size)
  console.log(`Resolved ${schools.size} schools, ${categories.size} document categories\n`)

  let jobs = collectJobs(schools)

  // Resume: anything already stored at the same size is done, so an interrupted
  // run restarts cheaply instead of re-uploading everything.
  if (!DRY_RUN) {
    const [done, media] = await Promise.all([loadExisting(supabase), loadExistingMedia(supabase)])
    const before = jobs.length
    jobs = jobs.filter((j) => {
      const p = plannedPathFor(j)
      // Branding assets live on the school record, not in school_documents, so
      // they need their own completion check or every run re-uploads all of them.
      if (j.parsed.mediaField) return media.get(`${j.schoolUuid}:${j.parsed.mediaField}`) !== p
      return done.get(p) !== fs.statSync(j.fullPath).size
    })
    if (before !== jobs.length) {
      console.log(`Resuming — ${before - jobs.length} already imported, ${jobs.length} remaining`)
    }
  }
  const work = LIMIT ? jobs.slice(0, LIMIT) : jobs
  console.log(`${jobs.length} live files to process${LIMIT ? ` (limited to ${work.length})` : ''}\n`)

  for (let i = 0; i < work.length; i += CONCURRENCY) {
    await Promise.all(
      work.slice(i, i + CONCURRENCY).map((job) => processFile(supabase, job, categories))
    )
    process.stdout.write(`\r  processed ${Math.min(i + CONCURRENCY, work.length)}/${work.length}`)
  }
  console.log('\n')
  report(work.length)
}

type Job = {
  schoolUuid: string
  legacyId: string
  fullPath: string
  parsed: ReturnType<typeof parseSchoolFile>
}

/** Walk the dump once, resolving each live file to a school and target path. */
function collectJobs(schools: Map<number, string>): Job[] {
  const jobs: Job[] = []

  for (const legacyId of fs.readdirSync(SOURCE).sort()) {
    const dir = path.join(SOURCE, legacyId)
    if (!fs.statSync(dir).isDirectory()) continue
    if (!/^\d+$/.test(legacyId)) {
      skipped.push({ file: legacyId, reason: 'folder name is not a legacy school id' })
      continue
    }
    const schoolUuid = schools.get(parseInt(legacyId, 10))
    if (!schoolUuid) {
      skipped.push({ file: legacyId, reason: `no school with legacy_id ${legacyId}` })
      continue
    }

    for (const full of walk(dir)) {
      const fileName = path.basename(full)
      if (fileName === '.DS_Store' || fileName === 'Thumbs.db') continue

      const parsed = parseSchoolFile(fileName)
      if (parsed.archived) continue                       // superseded by a live file
      if (fs.statSync(full).size === 0) {
        skipped.push({ file: fileName, reason: 'zero bytes' })
        continue
      }
      jobs.push({ schoolUuid, legacyId, fullPath: full, parsed })
    }
  }
  return dedupeBranding(jobs)
}

/**
 * A school can hold several files targeting the same media field (Logo.png and
 * School_logo.jpg). Only one can win, so pick by precedence then filename to
 * keep the result stable across runs — otherwise concurrency decides.
 */
function dedupeBranding(jobs: Job[]): Job[] {
  const winners = new Map<string, Job>()
  const rest: Job[] = []

  for (const job of jobs) {
    if (!job.parsed.mediaField) { rest.push(job); continue }
    const key = `${job.schoolUuid}:${job.parsed.mediaField}`
    const held = winners.get(key)
    if (!held || better(job, held)) {
      if (held) skipped.push({
        file: held.parsed.fileName,
        reason: `superseded by ${job.parsed.fileName} for ${held.parsed.mediaField}`,
      })
      winners.set(key, job)
    } else {
      skipped.push({
        file: job.parsed.fileName,
        reason: `superseded by ${held.parsed.fileName} for ${job.parsed.mediaField}`,
      })
    }
  }
  return [...rest, ...winners.values()]
}

function better(a: Job, b: Job): boolean {
  if (a.parsed.mediaPrecedence !== b.parsed.mediaPrecedence) {
    return a.parsed.mediaPrecedence < b.parsed.mediaPrecedence
  }
  return a.parsed.fileName.localeCompare(b.parsed.fileName) < 0
}

async function processFile(
  supabase: SupabaseClient,
  job: Job,
  categories: Map<string, number>
): Promise<void> {
  const { parsed, schoolUuid, legacyId, fullPath } = job

  // Branding assets belong on the school record, not in the document list.
  const categoryCode = parsed.mediaField ? 'school_gallery' : parsed.categoryCode
  const filePath = plannedPathFor(job)

  if (DRY_RUN) {
    if (parsed.mediaField) { stats.media++; plannedMedia.push(`${parsed.mediaField}  ${filePath}`) }
    else { stats.uploaded++; plannedDocs.push(`${categoryCode.padEnd(22)} ${filePath}`) }
    return
  }

  try {
    const body = fs.readFileSync(fullPath)
    const contentType = MIME[parsed.extension] ?? 'application/octet-stream'

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, body, { contentType, upsert: true })
    if (uploadError) {
      stats.failed++
      skipped.push({ file: parsed.fileName, reason: `upload: ${uploadError.message}` })
      return
    }

    if (parsed.mediaField) {
      const { error } = await supabase
        .from('schools')
        .update({ [parsed.mediaField]: filePath })
        .eq('id', schoolUuid)
      if (error) { stats.failed++; skipped.push({ file: parsed.fileName, reason: `schools update: ${error.message}` }) }
      else stats.media++
      return
    }

    const categoryId = categories.get(categoryCode) ?? categories.get('other')!
    const row = {
      school_id: schoolUuid,
      category_id: categoryId,
      file_name: parsed.baseName,
      file_path: filePath,
      file_size: body.length,
      mime_type: contentType,
      title: parsed.title,
      academic_year: parsed.academicYear,
      year_level: parsed.yearLevel,
      is_music_audition: parsed.isMusicAudition,
      source_file_name: parsed.fileName,
    }

    // file_path is deterministic, so it doubles as the natural key for re-runs.
    const { data: existing } = await supabase
      .from('school_documents')
      .select('id')
      .eq('file_path', filePath)
      .maybeSingle()

    const { error } = existing
      ? await supabase.from('school_documents').update(row).eq('id', existing.id)
      : await supabase.from('school_documents').insert(row)

    if (error) {
      stats.failed++
      skipped.push({ file: parsed.fileName, reason: `insert: ${error.message}` })
      // A client-side timeout does not mean the insert failed server-side.
      // Removing the object blindly can strand a committed row pointing at a
      // file that no longer exists, so confirm the row is really absent first.
      const { data: landed } = await supabase
        .from('school_documents').select('id').eq('file_path', filePath).maybeSingle()
      if (!landed) await supabase.storage.from(BUCKET).remove([filePath])
      return
    }
    if (existing) stats.updated++
    else stats.uploaded++
  } catch (err) {
    stats.failed++
    skipped.push({ file: parsed.fileName, reason: String(err) })
  }
}

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

/** Same path the importer will write to — kept in one place so resume matches. */
function plannedPathFor(job: Job): string {
  return buildDocumentPath({
    ownerId: job.schoolUuid,
    categoryCode: job.parsed.mediaField ? 'branding' : job.parsed.categoryCode,
    fileName: job.parsed.baseName,
    disambiguator: job.legacyId,
  })
}

/** "{school_uuid}:{field}" -> stored path, for branding assets already set. */
async function loadExistingMedia(supabase: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('schools').select('id, logo_url, campus_image_url, map_url').range(from, from + PAGE - 1)
    if (error) throw error
    for (const s of data ?? []) {
      if (s.logo_url) map.set(`${s.id}:logo_url`, s.logo_url)
      if (s.campus_image_url) map.set(`${s.id}:campus_image_url`, s.campus_image_url)
      if (s.map_url) map.set(`${s.id}:map_url`, s.map_url)
    }
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
      .from('school_documents').select('file_path, file_size').range(from, from + PAGE - 1)
    if (error) throw error
    for (const d of data ?? []) map.set(d.file_path, d.file_size ?? -1)
    if (!data || data.length < PAGE) break
  }
  return map
}

async function loadSchools(supabase: SupabaseClient): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('schools').select('id, legacy_id').range(from, from + PAGE - 1)
    if (error) throw error
    for (const s of data ?? []) if (s.legacy_id != null) map.set(s.legacy_id, s.id)
    if (!data || data.length < PAGE) break
  }
  return map
}

async function loadCategories(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('document_categories').select('id, code')
  if (error) throw error
  return new Map((data ?? []).map((c) => [c.code, c.id]))
}

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

function report(attempted: number) {
  stats.skipped = skipped.length
  console.log('Result')
  console.log(`  documents imported   ${stats.uploaded}`)
  console.log(`  documents updated    ${stats.updated}  (re-run, no duplicates)`)
  console.log(`  branding assets      ${stats.media}  -> schools.{logo,campus,map}_url`)
  console.log(`  skipped              ${stats.skipped}`)
  console.log(`  failed               ${stats.failed}`)

  const accounted = stats.uploaded + stats.updated + stats.media + stats.failed
  console.log(`\n  reconciliation: ${accounted} handled of ${attempted} attempted` +
    (accounted === attempted ? '  OK' : '  MISMATCH — investigate'))

  if (DRY_RUN) {
    console.log('\n  Sample planned document paths:')
    for (const p of plannedDocs.slice(0, 8)) console.log(`    ${p}`)
    console.log('\n  Planned branding assets:')
    for (const p of plannedMedia.slice(0, 8)) console.log(`    ${p}`)
  }

  if (skipped.length) {
    // Grouped rather than listed: a truncated list hides the shape of the
    // problem, which is the only thing that matters at this scale.
    const byReason: Record<string, number> = {}
    for (const s of skipped) {
      const key = s.reason.replace(/\d+/g, 'N')
      byReason[key] = (byReason[key] ?? 0) + 1
    }
    console.log('\n  Skips by reason:')
    for (const [reason, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(5)}  ${reason}`)
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
