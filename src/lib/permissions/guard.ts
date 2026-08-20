import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_LEVELS, hasMinLevel } from '@/lib/auth-utils'
import { ACCESS, type AccessLevel, type ModuleKey, type PermissionMap } from './modules'
import { getPermissions } from './resolve'

/** Boolean check, for conditional rendering. */
export async function canAccess(
  module: ModuleKey,
  level: AccessLevel = ACCESS.READ,
): Promise<boolean> {
  const permissions = await getPermissions()
  return (permissions[module] ?? ACCESS.NONE) >= level
}

/**
 * Page guard. Redirects to /403 when denied — "you may not see this" and "this
 * does not exist" are different messages, and a 404 on a real page just sends
 * people to support asking why the link is broken.
 */
export async function requireAccess(
  module: ModuleKey,
  level: AccessLevel = ACCESS.READ,
): Promise<void> {
  if (!(await canAccess(module, level))) redirect('/403')
}

/**
 * Server Action guard. Returns an ActionResult-shaped error when denied and null
 * when allowed — actions must never throw to the client (code-standards §11).
 *
 *   const denied = await assertAccess(MODULES.STAFF, ACCESS.WRITE)
 *   if (denied) return denied
 */
export async function assertAccess(
  module: ModuleKey,
  level: AccessLevel = ACCESS.READ,
): Promise<{ success: false; error: string } | null> {
  if (await canAccess(module, level)) return null
  return {
    success: false,
    error: 'You do not have permission to perform this action.',
  }
}

/**
 * Blocks privilege escalation when one staff member edits another's access.
 *
 * Without this, WRITE on the staff module is equivalent to Super Admin: the
 * holder can simply promote themselves. Two rules — you may not grant an admin
 * level more powerful than your own (levels are inverted: lower = more access),
 * and you may not grant module access beyond what you hold yourself.
 *
 * Returns an ActionResult-shaped error when rejected, null when allowed.
 */
export async function assertNoEscalation(
  callerLevel: number | null,
  target: { adminLevel?: number | null; access?: Record<string, AccessLevel> },
  callerPermissions?: PermissionMap,
): Promise<{ success: false; error: string } | null> {
  // Super Admin is unconditional, matching resolve_permissions()
  if (callerLevel === 0) return null

  if (callerLevel === null || callerLevel === undefined) {
    return { success: false, error: 'Your account has no access level set.' }
  }

  if (
    target.adminLevel !== null &&
    target.adminLevel !== undefined &&
    target.adminLevel < callerLevel
  ) {
    return {
      success: false,
      error: 'You cannot assign an access level higher than your own.',
    }
  }

  if (target.access) {
    const permissions = callerPermissions ?? (await getPermissions())
    for (const [moduleKey, access] of Object.entries(target.access)) {
      const own = permissions[moduleKey as ModuleKey] ?? ACCESS.NONE
      if (access > own) {
        return {
          success: false,
          error: `You cannot grant more access to ${moduleKey} than you have yourself.`,
        }
      }
    }
  }

  return null
}

/**
 * Reject when the caller is not senior enough to act on a given staff member.
 *
 * Read against the target's CURRENT level in the database rather than whatever
 * level arrived in the payload. Checking the payload alone was exploitable: a
 * request that simply omitted admin_level skipped the check entirely, so anyone
 * with staff:WRITE could reset a Super Admin's password or delete the account.
 *
 * Peers are allowed — a Manager may administer another Manager — otherwise
 * routine admin work stalls whenever two people share a level. Only strictly
 * more senior targets are protected.
 */
export async function assertOutranksTarget(
  targetProfileId: string,
): Promise<{ success: false; error: string } | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'You must be signed in.' }

  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, admin_level')
    .in('id', [user.id, targetProfileId])

  if (error) {
    console.error('Error checking staff seniority:', error)
    return { success: false, error: 'Could not verify permissions.' }
  }

  const callerLevel = rows?.find(r => r.id === user.id)?.admin_level ?? null
  if (callerLevel === ADMIN_LEVELS.SUPER_ADMIN) return null

  const targetLevel = rows?.find(r => r.id === targetProfileId)?.admin_level ?? null
  if (targetLevel === null) return null

  if (callerLevel === null || targetLevel < callerLevel) {
    return {
      success: false,
      error: 'You cannot modify a staff member with a higher access level than your own.',
    }
  }

  return null
}

/** Managing anyone's access rights needs seniority on top of staff:WRITE. */
export async function assertCanManageAccess(
  callerLevel: number | null,
): Promise<{ success: false; error: string } | null> {
  if (hasMinLevel(callerLevel, ADMIN_LEVELS.MANAGER)) return null
  return {
    success: false,
    error: 'Only managers and above can change access rights.',
  }
}
