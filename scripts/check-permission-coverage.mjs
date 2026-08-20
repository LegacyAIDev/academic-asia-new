#!/usr/bin/env node
/**
 * Fails when a dashboard page or a server action ships without a permission guard.
 *
 * The guards are the only thing enforcing access control — RLS is still
 * permissive for any authenticated user — so an unguarded route is a hole, not a
 * style problem. Cheap to check, easy to forget in review.
 */
import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const PAGES_GLOB = 'src/app/(dashboard)/**/page.tsx'
const ACTIONS_GLOB = 'src/lib/supabase/actions/*.ts'

/** Pages that legitimately have no guard. */
const PAGE_ALLOWLIST = ['src/app/(dashboard)/403/page.tsx']
/** Action files that legitimately have no guard. */
const ACTION_ALLOWLIST = ['src/lib/supabase/actions/auth.ts']

const problems = []

for (const file of globSync(PAGES_GLOB)) {
  const path = file.replaceAll('\\', '/')
  if (PAGE_ALLOWLIST.includes(path)) continue
  if (!readFileSync(file, 'utf8').includes('requireAccess(')) {
    problems.push(`${path} — page has no requireAccess() guard`)
  }
}

/**
 * Slice out one function body by brace matching, so each exported action is
 * checked individually. Comparing per-file counts was not enough: a file where
 * one action carried two guards and another carried none still balanced out.
 */
function functionBody(source, startIndex) {
  // Find the brace that opens the body: the first one at paren-depth zero that
  // ends its line. A naive "first {" lands inside return types such as
  // Promise<ActionResult<{ id: string }>> and reports every guarded action as
  // unguarded.
  let parens = 0
  let open = -1
  for (let i = startIndex; i < source.length; i++) {
    const c = source[i]
    if (c === '(') parens++
    else if (c === ')') parens--
    else if (c === '{' && parens === 0 && source[i + 1] === '\n') { open = i; break }
  }
  if (open === -1) return ''

  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  return source.slice(open)
}

for (const file of globSync(ACTIONS_GLOB)) {
  const path = file.replaceAll('\\', '/')
  if (ACTION_ALLOWLIST.includes(path)) continue

  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/^export async function (\w+)/gm)) {
    const body = functionBody(source, match.index)
    if (!body.includes('assertAccess(')) {
      problems.push(`${path}:${match[1]}() — exported action has no assertAccess() guard`)
    }
  }
}

if (problems.length > 0) {
  console.error('Permission coverage check failed:\n')
  for (const p of problems) console.error(`  ✗ ${p}`)
  console.error(`\n${problems.length} problem(s). Add a guard, or allowlist it in ${import.meta.filename.split('/').pop()} with a reason.`)
  process.exit(1)
}

console.log('Permission coverage OK — every dashboard page and server action is guarded.')
