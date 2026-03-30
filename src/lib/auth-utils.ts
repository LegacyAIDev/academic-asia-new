/** Admin level constants matching admin_levels.level column */
export const ADMIN_LEVELS = {
  SUPER_ADMIN: 0,
  MANAGER: 3,
  SENIOR_STAFF: 4,
  STAFF: 6,
  JUNIOR_STAFF: 7,
  BASIC: 8,
} as const

/** Check if user has at least the required access level (lower number = higher access) */
export function hasMinLevel(userLevel: number | null, requiredLevel: number): boolean {
  if (!userLevel) return false
  return userLevel <= requiredLevel
}

/** Extract admin_level from JWT claims (set by custom_access_token_hook) */
export function getAdminLevel(session: { user?: { app_metadata?: Record<string, unknown> } } | null): number {
  const level = session?.user?.app_metadata?.admin_level
  return typeof level === 'number' ? level : ADMIN_LEVELS.BASIC
}
