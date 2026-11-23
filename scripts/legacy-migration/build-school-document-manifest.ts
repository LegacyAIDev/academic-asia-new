/**
 * Builds the school document manifest that drives 37_migrate-school-documents.
 *
 * Usage:
 *   npx tsx scripts/build-school-document-manifest.ts                    # report only
 *   npx tsx scripts/build-school-document-manifest.ts --out review.csv   # + CSV for review
 *
 * Prints a classification summary by default and writes nothing. The manifest
 * is derived from the source tree in seconds, so it is a throwaway review aid
 * rather than a committed artifact — pass --out only when someone wants to
 * eyeball the classification in a spreadsheet.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parseSchoolFile } from './school-document-classifier'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const SOURCE = path.resolve(process.cwd(), argValue('--source', 'school-files'))
const OUT_ARG = argValue('--out', '')
const OUT = OUT_ARG ? path.resolve(process.cwd(), OUT_ARG) : null

const COLUMNS = [
  'legacy_school_id', 'rel_path', 'file_name', 'base_name', 'extension',
  'size', 'archived', 'category_code', 'media_field',
  'academic_year', 'year_level', 'is_music_audition', 'is_proceed', 'title',
] as const

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source directory not found: ${SOURCE}`)
    process.exit(1)
  }

  const rows: string[][] = []
  const stats = {
    schools: 0, files: 0, archived: 0, live: 0, media: 0,
    byCategory: {} as Record<string, number>,
  }

  for (const schoolId of fs.readdirSync(SOURCE).sort()) {
    const schoolDir = path.join(SOURCE, schoolId)
    if (!fs.statSync(schoolDir).isDirectory()) continue
    if (!/^\d+$/.test(schoolId)) {
      console.warn(`  skipping non-numeric folder: ${schoolId}`)
      continue
    }
    stats.schools++

    for (const { full, rel } of walk(schoolDir, SOURCE)) {
      const fileName = path.basename(full)
      if (fileName === '.DS_Store' || fileName === 'Thumbs.db') continue

      const parsed = parseSchoolFile(fileName)
      const size = fs.statSync(full).size

      stats.files++
      if (parsed.archived) stats.archived++
      else {
        stats.live++
        if (parsed.mediaField) stats.media++
        else stats.byCategory[parsed.categoryCode] = (stats.byCategory[parsed.categoryCode] ?? 0) + 1
      }

      rows.push([
        schoolId, rel, fileName, parsed.baseName, parsed.extension,
        String(size), parsed.archived ? '1' : '0',
        parsed.categoryCode, parsed.mediaField ?? '',
        parsed.academicYear ?? '', parsed.yearLevel ?? '',
        parsed.isMusicAudition ? '1' : '0', parsed.isProceed ? '1' : '0',
        parsed.title,
      ])
    }
  }

  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, [
      COLUMNS.join(','),
      ...rows.map((r) => r.map(csvCell).join(',')),
    ].join('\n'))
  }

  report(stats, rows.length)
}

function* walk(dir: string, root: string): Generator<{ full: string; rel: string }> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full, root)
    else yield { full, rel: path.relative(root, full) }
  }
}

type ManifestStats = {
  schools: number; files: number; archived: number; live: number; media: number
  byCategory: Record<string, number>
}

function report(s: ManifestStats, total: number) {
  console.log(OUT ? `\nManifest written: ${OUT}` : `\nSchool file scan (no CSV written — pass --out to export)`)
  console.log(`  schools           ${s.schools}`)
  console.log(`  files             ${s.files}  (rows: ${total})`)
  console.log(`  archived (.old)   ${s.archived}  — excluded from import`)
  console.log(`  live              ${s.live}`)
  console.log(`  branding assets   ${s.media}  — routed to schools.{logo,campus,map}_url`)
  console.log(`\n  live documents by category:`)
  const entries = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1])
  const docTotal = entries.reduce((n, [, c]) => n + c, 0)
  for (const [code, count] of entries) {
    const pct = ((count / docTotal) * 100).toFixed(1)
    console.log(`    ${code.padEnd(22)} ${String(count).padStart(5)}  ${pct.padStart(5)}%`)
  }
  const other = s.byCategory['other'] ?? 0
  if (docTotal > 0) {
    console.log(`\n  'other' share: ${((other / docTotal) * 100).toFixed(1)}%`)
  }
}

main()
