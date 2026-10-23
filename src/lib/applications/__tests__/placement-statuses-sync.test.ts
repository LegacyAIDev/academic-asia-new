import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { NOT_APPLICATION_STATUS_CODES, OFFER_STATUS_CODES, PLACED_STATUS_CODES } from '../placement-statuses'

/**
 * The status lists live twice: here and in the application_placement_outcomes
 * view. This reads the newest migration defining the view and compares.
 */
function newestViewSql(): string {
  const dir = join(process.cwd(), 'supabase/migrations')
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .reverse()
  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8')
    if (/create (or replace )?view public\.application_placement_outcomes/.test(sql)) return sql
  }
  throw new Error('no migration defines application_placement_outcomes')
}

function codes(list: string): string[] {
  return [...list.matchAll(/'([a-z_]+)'/g)].map(m => m[1])
}

/** The quoted codes of the array that precedes the given SQL alias (or follows `<> all`). */
function arrayBefore(sql: string, alias: string): string[] {
  const match = sql.match(new RegExp(`array\\[([^\\]]*)\\]\\)[^\\n]*as ${alias}`))
  if (!match) throw new Error(`array for ${alias} not found`)
  return codes(match[1])
}

describe('placement status lists', () => {
  const sql = newestViewSql()

  it('placed codes match the view', () => {
    expect([...PLACED_STATUS_CODES].sort()).toEqual(arrayBefore(sql, 'placed_status').sort())
  })

  it('offer codes match the view', () => {
    expect([...OFFER_STATUS_CODES].sort()).toEqual(arrayBefore(sql, 'offer_status').sort())
  })

  it('codes that are not applications match the view', () => {
    const match = sql.match(/<> all \(array\[([^\]]*)\]\)/)
    expect(match).not.toBeNull()
    expect([...NOT_APPLICATION_STATUS_CODES].sort()).toEqual(codes(match![1]).sort())
  })
})
