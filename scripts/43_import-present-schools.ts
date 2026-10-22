/**
 * Data Migration: load the Hong Kong school list into present_schools and link
 * the students whose typed current school is on it.
 *
 * Usage:
 *   npx tsx scripts/43_import-present-schools.ts --dry-run
 *   npx tsx scripts/43_import-present-schools.ts [--file <path>]
 *
 * The list holds 1,230 primary and secondary schools, 234 of them with a second
 * spelling ("A / B"). Schools are matched on presentSchoolKey(), shared with the
 * student form's picker, so the import and staff searching agree on spellings.
 *
 * Linking is exact only: a student is linked when their present_school text has
 * the key of one school's name or alternative spelling. Bare names of schools the
 * list splits into (PRIMARY) and (SECONDARY) match nothing and are left to staff.
 * Only an empty present_school_id is written; the typed text is never changed, so
 * a link is undone with "set present_school_id = null".
 *
 * Idempotent: unchanged schools are not rewritten and linked students skipped.
 * Every read is paged because the API returns at most 1,000 rows.
 */

import * as fs from 'fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { parseSchoolListLine, presentSchoolKey, schoolSearchKeys } from '../src/lib/students/present-school-name'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FILE_ARG = args.indexOf('--file')
if (FILE_ARG !== -1 && !args[FILE_ARG + 1]) fail('--file needs a path')
const LIST_FILE = FILE_ARG === -1 ? 'requirements/Hong_Kong_All_Primary_and_Secondary_Schools.txt' : args[FILE_ARG + 1]
const REPORT_FILE = 'data/present-school-import-report.json'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SECRET_KEY) fail('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')

const PAGE = 1000
// Student ids go into the URL of the update; 200 uuids keep it well under the gateway limit.
const LINK_BATCH = 200

type SchoolRow = { id: number; name: string; aliases: string[]; match_key: string; search_keys: string[]; source: string }
type ListEntry = Omit<SchoolRow, 'id' | 'source'>

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function readAll<T>(label: string, page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) fail(`Reading ${label} failed: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

function readList(): ListEntry[] {
  return fs.readFileSync(LIST_FILE, 'utf8').split('\n').map(parseSchoolListLine)
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .map(({ name, aliases }) => ({ name, aliases, match_key: presentSchoolKey(name), search_keys: schoolSearchKeys(name, aliases) }))
}

/**
 * Every search key pointing at the match key of the school that answers to it.
 * Two schools sharing a key would make each student with that spelling a guess,
 * so that stops the run until the list or the table is fixed by hand.
 */
function ownersByKey(schools: Pick<SchoolRow, 'match_key' | 'search_keys'>[], where: string) {
  const owner = new Map<string, string>()
  for (const s of schools) {
    for (const key of s.search_keys) {
      const other = owner.get(key)
      if (other && other !== s.match_key) fail(`Key "${key}" belongs to both "${other}" and "${s.match_key}" in ${where}.`)
      owner.set(key, s.match_key)
    }
  }
  return owner
}

const readSchools = (supabase: SupabaseClient) =>
  readAll<SchoolRow>('present_schools', (from, to) =>
    supabase.from('present_schools').select('id, name, aliases, match_key, search_keys, source').order('id').range(from, to))

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i])

async function main() {
  const supabase = createClient(SUPABASE_URL, SECRET_KEY!)
  const list = readList()
  const listOwner = ownersByKey(list, 'the list file')
  const existing = await readSchools(supabase)
  const byMatchKey = new Map(existing.map((s) => [s.match_key, s]))
  const keyOwner = ownersByKey(existing, 'present_schools')

  // A list spelling already used by a different school (e.g. one staff added) is a conflict to resolve by hand.
  for (const e of list) {
    const clash = e.search_keys.find((k) => keyOwner.has(k) && keyOwner.get(k) !== e.match_key)
    if (clash) fail(`List school "${e.name}" has key "${clash}", already used by "${keyOwner.get(clash)}".`)
  }

  // A school staff added under the same key as a list entry is that school: it takes the list's spelling.
  const toInsert = list.filter((e) => !byMatchKey.has(e.match_key))
  const toUpdate = list.filter((e) => {
    const s = byMatchKey.get(e.match_key)
    return s && (s.source !== 'hk_list' || s.name !== e.name || !sameList(s.aliases, e.aliases) || !sameList(s.search_keys, e.search_keys))
  })

  // Every key any school answers to, list and staff-added alike.
  const schoolForKey = new Map([...keyOwner, ...listOwner])

  const { count: total } = await supabase.from('students').select('id', { count: 'exact', head: true })
    .not('present_school', 'is', null).is('present_school_id', null)
  const students = await readAll<{ id: string; present_school: string }>('students', (from, to) =>
    supabase.from('students').select('id, present_school').not('present_school', 'is', null)
      .is('present_school_id', null).order('id').range(from, to))
  if (students.length !== total) fail(`Read ${students.length} students but ${total} match; aborting.`)

  const toLink = new Map<string, string[]>()
  const unlinked = new Map<string, { count: number; spellings: Map<string, number> }>()
  let blank = 0
  for (const s of students) {
    const key = presentSchoolKey(s.present_school)
    if (!key) {
      blank += 1
      continue
    }
    const matchKey = schoolForKey.get(key)
    if (matchKey) {
      const ids = toLink.get(matchKey) ?? []
      ids.push(s.id)
      toLink.set(matchKey, ids)
      continue
    }
    const u = unlinked.get(key) ?? { count: 0, spellings: new Map() }
    u.count += 1
    u.spellings.set(s.present_school, (u.spellings.get(s.present_school) ?? 0) + 1)
    unlinked.set(key, u)
  }

  const linkCount = [...toLink.values()].reduce((n, ids) => n + ids.length, 0)
  const unlinkedRows = [...unlinked.entries()]
    .map(([key, u]) => ({ key, students: u.count, spellings: [...u.spellings].sort((a, b) => b[1] - a[1]).map(([raw, n]) => ({ raw, n })) }))
    .sort((a, b) => b.students - a.students)
  const unlinkedCount = unlinkedRows.reduce((n, r) => n + r.students, 0)

  console.log(`List entries read: ${list.length} (${list.filter((e) => e.aliases.length).length} with another spelling)`)
  console.log(`Schools already in present_schools: ${existing.length}`)
  console.log(`  to insert: ${toInsert.length} | to update: ${toUpdate.length} | unchanged: ${list.length - toInsert.length - toUpdate.length}`)
  console.log(`Students with school text and no link: ${students.length}`)
  console.log(`  to link: ${linkCount} (to ${toLink.size} schools) | left unlinked: ${unlinkedCount} (${unlinked.size} spellings by key) | blank: ${blank}`)

  const linkedPerSchool = [...toLink].map(([school, ids]) => ({ school, students: ids.length })).sort((a, b) => b.students - a.students)
  fs.writeFileSync(REPORT_FILE, JSON.stringify({ linkedPerSchool, unlinked: unlinkedRows }, null, 2))
  console.log(`Full report written to ${REPORT_FILE}`)

  console.log('\nMOST COMMON UNLINKED SPELLINGS:')
  unlinkedRows.slice(0, 30).forEach((r) => console.log(`  ${r.students.toString().padStart(5)}  ${r.spellings[0].raw}`))

  if (DRY_RUN) {
    console.log('\n--dry-run: no writes.')
    return
  }

  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supabase.from('present_schools').insert(toInsert.slice(i, i + 500).map((e) => ({ ...e, source: 'hk_list' })))
    if (error) fail(`Insert failed: ${error.message}`)
  }
  for (const e of toUpdate) {
    const { error } = await supabase.from('present_schools')
      .update({ name: e.name, aliases: e.aliases, search_keys: e.search_keys, source: 'hk_list' })
      .eq('match_key', e.match_key)
    if (error) fail(`Update of "${e.name}" failed: ${error.message}`)
  }

  const idFor = new Map((await readSchools(supabase)).map((s) => [s.match_key, s.id]))
  let linked = 0
  for (const [matchKey, ids] of toLink) {
    for (let i = 0; i < ids.length; i += LINK_BATCH) {
      // The null guard leaves alone any student staff linked while this ran.
      const { data, error } = await supabase.from('students').update({ present_school_id: idFor.get(matchKey) })
        .in('id', ids.slice(i, i + LINK_BATCH)).is('present_school_id', null).select('id')
      if (error) fail(`Linking students to "${matchKey}" failed: ${error.message}`)
      linked += data?.length ?? 0
    }
  }

  console.log(`\nDone. Inserted ${toInsert.length}, updated ${toUpdate.length} schools; linked ${linked} students.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
