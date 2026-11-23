/** Admin level constants matching admin_levels.level column */
export const ADMIN_LEVELS = {
  SUPER_ADMIN: 0,
  MANAGER: 3,
  SENIOR_STAFF: 4,
  STAFF: 6,
  JUNIOR_STAFF: 7,
  BASIC: 8,
} as const

/**
 * Check if user has at least the required access level (lower number = higher access).
 *
 * Tests for null explicitly: Super Admin is level 0, which is falsy, so a
 * truthiness check here locked out the most privileged accounts.
 */
export function hasMinLevel(userLevel: number | null | undefined, requiredLevel: number): boolean {
  if (userLevel === null || userLevel === undefined) return false
  return userLevel <= requiredLevel
}
