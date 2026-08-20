/**
 * Data Migration: backfill student profile photos from the legacy file dump.
 *
 * Usage:
 *   npx tsx scripts/36_backfill-student-photos.ts --dry-run
 *   npx tsx scripts/36_backfill-student-photos.ts --limit 20
 *   npx tsx scripts/36_backfill-student-photos.ts
 *
 * A profile photo is an attribute, not a document, so these land on
 * students.photo_url rather than in student_documents — otherwise every photo
 * would show up in the student's document list.
 *
 * The source files are BMP, which the bucket does not accept and which averages
 * 341 KB for a thumbnail. They are converted to WebP on the way in.
 *
 * The 54 rows that already carry a photo_url hold dead Windows paths from the
 * old system (`M:\Photo Temp\...`), so they are overwritten rather than kept.
 *
 * Resumable: re-running skips students whose photo_url already points at the
 * path this script would write.
 */

import * as fs from 'fs'
import sharp from 'sharp'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { buildManifest } from './build-student-document-manifest'
import { buildDocumentPath } from '../src/lib/supabase/storage-paths'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const LIMIT = args.includes('--limit') ? parseInt(argValue('--limit', '0'), 10) : null
const CONCURRENCY = parseInt(argValue('--concurrency', '10'), 10)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const READ_KEY = SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const BUCKET = 'student-documents'
/** Profile photos render as small avatars — no reason to keep full resolution. */
const MAX_DIMENSION = 800
const WEBP_QUALITY = 82

const skipped: { file: string; reason: string }[] = []
const stats = { converted: 0, skippedExisting: 0, failed: 0, bytesIn: 0, bytesOut: 0 }

async function main() {
  if (!SUPABASE_URL || !READ_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / Supabase key in .env.local')
    process.exit(1)
  }
  if (!DRY_RUN && !SECRET_KEY) {
    console.error('A Supabase secret key is required to write.\n')
    console.error('  Add to .env.local:\n    SUPABASE_SECRET_KEY=sb_secret_...')
    process.exit(1)
  }
  if (DRY_RUN) console.log('DRY RUN — nothing will be uploaded or written\n')

  const supabase = createClient(SUPABASE_URL, READ_KEY, { auth: { persistSession: false } })

  console.log('Scanning source tree...')
  const photos = buildManifest().filter((r) => r.isPhoto && !r.archived)
  const students = await loadStudents(supabase)

  if (students.size === 0) {
    console.error('\nNo students resolved — refusing to continue.')
    console.error('RLS applies to authenticated roles only; set SUPABASE_SECRET_KEY in .env.local.')
    process.exit(1)
  }

  let jobs = photos
    .filter((r) => {
      if (!r.studentCode) { skipped.push({ file: r.folder, reason: 'no student code' }); return false }
      if (!students.has(r.studentCode)) { skipped.push({ file: r.folder, reason: `no student ${r.studentCode}` }); return false }
      if (r.size === 0) { skipped.push({ file: r.fileName, reason: 'zero bytes' }); return false }
      return true
    })
    .map((r) => ({
      row: r,
      studentId: students.get(r.studentCode!)!.id,
      currentUrl: students.get(r.studentCode!)!.photoUrl,
      filePath: buildDocumentPath({
        ownerId: students.get(r.studentCode!)!.id,
        categoryCode: 'photo',
        fileName: 'photo.webp',
        disambiguator: r.folderKey,
      }),
    }))

  if (!DRY_RUN) {
    const before = jobs.length
    jobs = jobs.filter((j) => j.currentUrl !== j.filePath)
    stats.skippedExisting = before - jobs.length
    if (stats.skippedExisting) console.log(`Resuming — ${stats.skippedExisting} already backfilled`)
  }
  if (LIMIT) jobs = jobs.slice(0, LIMIT)

  console.log(`${jobs.length} photos to convert and upload\n`)

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    await Promise.all(jobs.slice(i, i + CONCURRENCY).map((j) => processPhoto(supabase, j)))
    process.stdout.write(`\r  processed ${Math.min(i + CONCURRENCY, jobs.length)}/${jobs.length}`)
  }
  console.log('\n')
  report(jobs.length)
}

type PhotoJob = {
  row: { fullPath: string; fileName: string; size: number }
  studentId: string
  currentUrl: string | null
  filePath: string
}

async function processPhoto(supabase: SupabaseClient, job: PhotoJob): Promise<void> {
  try {
    const webp = await sharp(fs.readFileSync(job.row.fullPath))
      .rotate()                                   // honour EXIF orientation
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

    stats.bytesIn += job.row.size
    stats.bytesOut += webp.length

    if (DRY_RUN) { stats.converted++; return }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(job.filePath, webp, { contentType: 'image/webp', upsert: true })
    if (uploadError) {
      stats.failed++
      skipped.push({ file: job.row.fileName, reason: `upload: ${uploadError.message}` })
      return
    }

    const { error } = await supabase
      .from('students').update({ photo_url: job.filePath }).eq('id', job.studentId)
    if (error) {
      stats.failed++
      skipped.push({ file: job.row.fileName, reason: `update: ${error.message}` })
      await supabase.storage.from(BUCKET).remove([job.filePath])
      return
    }
    stats.converted++
  } catch (err) {
    // Corrupt BMPs are expected in a dump this old — record, don't abort.
    stats.failed++
    skipped.push({ file: job.row.fileName, reason: `convert: ${String(err).slice(0, 80)}` })
  }
}

async function loadStudents(
  supabase: SupabaseClient
): Promise<Map<string, { id: string; photoUrl: string | null }>> {
  const map = new Map<string, { id: string; photoUrl: string | null }>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('students').select('id, student_code, photo_url')
      .not('student_code', 'is', null).range(from, from + PAGE - 1)
    if (error) throw error
    for (const s of data ?? []) map.set(s.student_code, { id: s.id, photoUrl: s.photo_url })
    if (!data || data.length < PAGE) break
  }
  return map
}

function report(attempted: number) {
  const mb = (n: number) => (n / 1024 ** 2).toFixed(0)
  console.log('Result')
  console.log(`  photos backfilled    ${stats.converted}`)
  console.log(`  already done         ${stats.skippedExisting}`)
  console.log(`  skipped              ${skipped.length}`)
  console.log(`  failed               ${stats.failed}`)
  if (stats.bytesIn > 0) {
    const saved = (1 - stats.bytesOut / stats.bytesIn) * 100
    console.log(`\n  BMP ${mb(stats.bytesIn)} MB -> WebP ${mb(stats.bytesOut)} MB  (${saved.toFixed(0)}% smaller)`)
  }
  const handled = stats.converted + stats.failed
  console.log(`\n  reconciliation: ${handled} handled of ${attempted} attempted` +
    (handled === attempted ? '  OK' : '  MISMATCH — investigate'))

  if (skipped.length) {
    const byReason: Record<string, number> = {}
    for (const s of skipped) {
      const key = s.reason.replace(/S\d+/g, '…').replace(/\d+/g, 'N')
      byReason[key] = (byReason[key] ?? 0) + 1
    }
    console.log('\n  Skips by reason:')
    for (const [reason, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      console.log(`    ${String(n).padStart(5)}  ${reason}`)
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
