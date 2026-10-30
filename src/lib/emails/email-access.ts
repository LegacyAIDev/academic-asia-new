import { ACCESS, MODULES, type AccessLevel, type ModuleKey } from '@/lib/permissions/modules'

/**
 * Filed emails have no module of their own (EF-24). An email linked to a
 * student is a student email and follows Students rights; one linked only to
 * a school follows Schools rights. That owning record decides who may file,
 * edit, archive or delete it (WRITE). Any other linked record only needs to be
 * visible to the user (READ): a consultant with Students write and Schools
 * read can file an application email that also shows on the school page (D4).
 * Reading an email needs read access to any one linked record.
 */

type Links = { studentId?: string | null; schoolId?: string | null }
export type AccessCheck = { module: ModuleKey; level: AccessLevel }

export function emailModules(links: Links): ModuleKey[] {
  const modules: ModuleKey[] = []
  if (links.studentId) modules.push(MODULES.STUDENTS)
  if (links.schoolId) modules.push(MODULES.SCHOOLS)
  return modules
}

/** WRITE on the owning record (student when linked, else school), READ on the other. */
export function writeChecks(links: Links): AccessCheck[] {
  if (links.studentId) {
    return [
      { module: MODULES.STUDENTS, level: ACCESS.WRITE },
      ...(links.schoolId ? [{ module: MODULES.SCHOOLS, level: ACCESS.READ }] : []),
    ]
  }
  return links.schoolId ? [{ module: MODULES.SCHOOLS, level: ACCESS.WRITE }] : []
}

/** Checks for an edit: the rules of the links before and after, the stricter level per module. */
export function writeChecksForChange(before: Links, after: Links): AccessCheck[] {
  const strictest = new Map<ModuleKey, AccessLevel>()
  for (const check of [...writeChecks(before), ...writeChecks(after)]) {
    strictest.set(check.module, Math.max(strictest.get(check.module) ?? ACCESS.NONE, check.level) as AccessLevel)
  }
  return [...strictest].map(([module, level]) => ({ module, level }))
}

type Denied = { success: false; error: string }
const REFUSED: Denied = { success: false, error: 'You do not have permission to perform this action.' }

/** Runs every check and returns the first refusal; no checks at all is refused, not allowed. */
export async function firstDenied(
  checks: AccessCheck[],
  run: (module: ModuleKey, level: AccessLevel) => Promise<Denied | null>,
): Promise<Denied | null> {
  if (checks.length === 0) return REFUSED
  for (const { module: key, level } of checks) {
    const denied = await run(key, level)
    if (denied) return denied
  }
  return null
}

/** Reading: allowed when any one linked module allows it. */
export async function anyAllowed(
  modules: ModuleKey[],
  check: (module: ModuleKey) => Promise<Denied | null>,
): Promise<Denied | null> {
  let last: Denied = REFUSED
  for (const key of modules) {
    const denied = await check(key)
    if (!denied) return null
    last = denied
  }
  return last
}
