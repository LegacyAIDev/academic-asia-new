import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ACCESS, MODULE_KEYS, denyAll, toAccessLevel } from '../modules'

/**
 * MODULE_KEYS is hand-maintained so a typo fails at compile time, which means it
 * can drift from the seeded rows. This reads every migration that seeds
 * permission_modules and compares.
 */
function seededModuleKeys(): string[] {
  const dir = join(process.cwd(), 'supabase/migrations')
  const keys = new Set<string>()
  for (const file of readdirSync(dir).filter(f => f.endsWith('.sql'))) {
    const sql = readFileSync(join(dir, file), 'utf8')
    for (const block of sql.split('insert into public.permission_modules').slice(1)) {
      const values = block.slice(0, block.indexOf(';'))
      for (const m of values.matchAll(/\('([a-z_]+)',\s*'[^']+',\s*\d+\)/g)) keys.add(m[1])
    }
  }
  if (keys.size === 0) throw new Error('no permission_modules seed found in migrations')
  return [...keys]
}

describe('module keys', () => {
  it('match the seeded permission_modules rows exactly', () => {
    expect([...MODULE_KEYS].sort()).toEqual(seededModuleKeys().sort())
  })

  it('has no duplicates', () => {
    expect(new Set(MODULE_KEYS).size).toBe(MODULE_KEYS.length)
  })
})

describe('denyAll', () => {
  it('closes every module', () => {
    const map = denyAll()
    expect(Object.keys(map).sort()).toEqual([...MODULE_KEYS].sort())
    expect(Object.values(map).every(v => v === ACCESS.NONE)).toBe(true)
  })
})

describe('toAccessLevel', () => {
  it('passes through valid levels', () => {
    expect(toAccessLevel(ACCESS.READ)).toBe(ACCESS.READ)
    expect(toAccessLevel(ACCESS.WRITE)).toBe(ACCESS.WRITE)
  })

  it('closes anything unrecognised rather than opening it', () => {
    for (const bad of [null, undefined, 3, -1, '2', {}, NaN]) {
      expect(toAccessLevel(bad)).toBe(ACCESS.NONE)
    }
  })
})
