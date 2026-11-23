/**
 * Builds the student document manifest that drives 35_migrate-student-documents.
 *
 * Usage:
 *   npx tsx scripts/build-student-document-manifest.ts                  # report only
 *   npx tsx scripts/build-student-document-manifest.ts --out review.csv # + CSV
 *
 * Derived from the source tree in seconds, so it is a review aid rather than a
 * committed artifact — pass --out only when someone wants to inspect it.
 */

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { parseStudentFile, parseStudentFolder } from './student-document-classifier'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const SOURCE = path.resolve(process.cwd(), argValue('--source', 'studentdatafile'))
const OUT_ARG = argValue('--out', '')
const OUT = OUT_ARG ? path.resolve(process.cwd(), OUT_ARG) : null

const COLUMNS = [
  'folder', 'legacy_num_id', 'folder_key', 'student_code', 'code_recovered', 'name_slug',
  'rel_path', 'file_name', 'base_name', 'extension', 'size',
  'archived', 'is_photo', 'category_code', 'title',
] as const

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export type ManifestRow = {
  folder: string; legacyNumId: string; folderKey: string; studentCode: string | null
  codeRecovered: boolean; nameSlug: string; relPath: string; fullPath: string
  fileName: string; baseName: string; extension: string; size: number
  archived: boolean; isPhoto: boolean; categoryCode: string; title: string
}

/**
 * 157 folders omit the student code (`42262__NAME`). Most have a sibling folder
 * sharing the same legacy numeric id that does carry it, so the code is
 * recoverable rather than lost.
 */
function buildCodeRecoveryMap(folders: string[]): Map<string, string> {
  const byNum = new Map<string, string>()
  for (const folder of folders) {
    const parsed = parseStudentFolder(folder)
    if (parsed?.studentCode) byNum.set(parsed.legacyNumId, parsed.studentCode)
  }
  return byNum
}

export function buildManifest(source = SOURCE): ManifestRow[] {
  const folders = fs.readdirSync(source).filter((f) =>
    fs.statSync(path.join(source, f)).isDirectory()
  )
  const recovery = buildCodeRecoveryMap(folders)
  const rows: ManifestRow[] = []

  for (const folder of folders.sort()) {
    const parsed = parseStudentFolder(folder)
    if (!parsed) continue

    let studentCode = parsed.studentCode
    let codeRecovered = false
    if (!studentCode) {
      const recovered = recovery.get(parsed.legacyNumId)
      if (recovered) { studentCode = recovered; codeRecovered = true }
    }

    for (const full of walk(path.join(source, folder))) {
      const fileName = path.basename(full)
      if (fileName === '.DS_Store' || fileName === 'Thumbs.db') continue

      const file = parseStudentFile(fileName)
      rows.push({
        folder, legacyNumId: parsed.legacyNumId, folderKey: folderKey(folder),
        studentCode, codeRecovered,
        nameSlug: parsed.nameSlug,
        relPath: path.relative(source, full), fullPath: full,
        fileName, baseName: file.baseName, extension: file.extension,
        size: fs.statSync(full).size,
        archived: file.archived, isPhoto: file.isPhoto,
        categoryCode: file.categoryCode, title: file.title,
      })
    }
  }
  return rows
}

/**
 * Storage-path disambiguator, unique per source folder.
 *
 * The legacy numeric id alone is NOT enough: 402 students have two folders
 * carrying the same number, differing only in name order
 * (TSANG_ChunTungDanny vs TSANG_DannyChunTung). Using the number alone made
 * 892 documents collide onto the same path and silently overwrite each other.
 *
 * The folder name itself is unique but contains the student's name, and names
 * must not appear in storage paths — so it is hashed. The numeric id is kept
 * in front to stay traceable back to the source folder by eye.
 */
export function folderKey(folder: string): string {
  const num = folder.split('_')[0]
  const hash = crypto.createHash('sha1').update(folder).digest('hex').slice(0, 6)
  return `${num}-${hash}`
}

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source directory not found: ${SOURCE}`)
    process.exit(1)
  }

  const rows = buildManifest()
  const live = rows.filter((r) => !r.archived)
  const docs = live.filter((r) => !r.isPhoto)
  const photos = live.filter((r) => r.isPhoto)
  const gb = (n: number) => (n / 1024 ** 3).toFixed(2)

  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, [
      COLUMNS.join(','),
      ...rows.map((r) => [
        r.folder, r.legacyNumId, r.folderKey, r.studentCode ?? '', r.codeRecovered ? '1' : '0',
        r.nameSlug, r.relPath, r.fileName, r.baseName, r.extension, r.size,
        r.archived ? '1' : '0', r.isPhoto ? '1' : '0', r.categoryCode, r.title,
      ].map(csvCell).join(',')),
    ].join('\n'))
  }

  console.log(OUT ? `\nManifest written: ${OUT}` : '\nStudent file scan (pass --out to export CSV)')
  console.log(`  folders             ${new Set(rows.map((r) => r.folder)).size}`)
  console.log(`  files               ${rows.length}`)
  console.log(`  archived (.old)     ${rows.filter((r) => r.archived).length}  — excluded`)
  console.log(`  live                ${live.length}  (${gb(live.reduce((n, r) => n + r.size, 0))} GB)`)
  console.log(`    documents         ${docs.length}  (${gb(docs.reduce((n, r) => n + r.size, 0))} GB)`)
  console.log(`    photos            ${photos.length}  -> students.photo_url`)

  const withCode = docs.filter((r) => r.studentCode)
  const recovered = docs.filter((r) => r.codeRecovered)
  console.log(`\n  documents with a student_code   ${withCode.length}  (${((withCode.length / docs.length) * 100).toFixed(1)}%)`)
  console.log(`    ...of which recovered via sibling folder  ${recovered.length}`)
  console.log(`  documents with NO student_code  ${docs.length - withCode.length}`)
  console.log(`  distinct students               ${new Set(withCode.map((r) => r.studentCode)).size}`)

  const byCat: Record<string, number> = {}
  for (const r of docs) byCat[r.categoryCode] = (byCat[r.categoryCode] ?? 0) + 1
  console.log('\n  documents by category:')
  for (const [code, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code.padEnd(24)} ${String(n).padStart(6)}  ${((n / docs.length) * 100).toFixed(1).padStart(5)}%`)
  }

  const oversized = docs.filter((r) => r.size > 50 * 1024 ** 2)
  const empty = docs.filter((r) => r.size === 0)
  console.log(`\n  quarantine: ${oversized.length} over 50 MB, ${empty.length} zero-byte`)
  for (const r of oversized.slice(0, 5)) {
    console.log(`    ${(r.size / 1024 ** 2).toFixed(0).padStart(4)} MB  ${r.fileName}`)
  }
}

if (require.main === module) main()
