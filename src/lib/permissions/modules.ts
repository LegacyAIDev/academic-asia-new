/**
 * Module access rights — the modern form of the legacy "Access Right" grid.
 *
 * Access is an ordered scalar rather than a pair of read/write booleans, so every
 * check is a single comparison (`access >= ACCESS.READ`) and no combination can
 * express a contradiction the way "Read Write ☑ / Read Only ☑" could.
 */

export const ACCESS = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
} as const

export type AccessLevel = (typeof ACCESS)[keyof typeof ACCESS]

/**
 * Module keys, mirroring the `permission_modules.key` seed.
 *
 * Duplicated here on purpose: a typo should fail at compile time rather than
 * silently resolving to NONE at runtime. A test asserts the two lists match.
 */
export const MODULES = {
  DASHBOARD: 'dashboard',
  STUDENTS: 'students',
  SCHOOLS: 'schools',
  EVENTS: 'events',
  EXAMS: 'exams',
  STAFF: 'staff',
  REPORTS: 'reports',
  SETTINGS: 'settings',
} as const

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES]

export const MODULE_KEYS = Object.values(MODULES) as ModuleKey[]

export type PermissionMap = Record<ModuleKey, AccessLevel>

/** Every module denied. The fallback whenever permissions cannot be resolved. */
export function denyAll(): PermissionMap {
  return Object.fromEntries(MODULE_KEYS.map(k => [k, ACCESS.NONE])) as PermissionMap
}

/** Narrow an arbitrary number from the database to an AccessLevel, defaulting to NONE. */
export function toAccessLevel(value: unknown): AccessLevel {
  return value === ACCESS.READ || value === ACCESS.WRITE ? value : ACCESS.NONE
}

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  [ACCESS.NONE]: 'None',
  [ACCESS.READ]: 'Read',
  [ACCESS.WRITE]: 'Write',
}
