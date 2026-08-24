'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/auth'
import {
  assertAccess, assertNoEscalation, assertOutranksTarget, assertCanManageAccess,
} from '@/lib/permissions/guard'
import { ACCESS, MODULES, toAccessLevel, type AccessLevel, type ModuleKey } from '@/lib/permissions/modules'
import { getPermissionModules, getLevelPermissions } from '@/lib/supabase/queries/permissions'

type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}

/** Turn a module-id map into a module-key map, for the escalation check. */
async function keyed(
  access: Record<number, AccessLevel>,
): Promise<Record<string, AccessLevel>> {
  const modules = await getPermissionModules()
  return Object.fromEntries(
    modules
      .filter(m => access[m.id] !== undefined)
      .map(m => [m.key, access[m.id]]),
  )
}

/**
 * Replace a staff member's access-right overrides.
 *
 * Only genuine deviations from the level default are stored. Rows matching the
 * default are deleted instead, so a later change to that level still propagates
 * to everyone who never deviated — which is the whole point of inheritance.
 */
export async function setProfilePermissions(
  profileId: string,
  overrides: Record<number, AccessLevel>,
): Promise<ActionResult> {
  try {
    const denied = await assertAccess(MODULES.STAFF, ACCESS.WRITE)
    if (denied) return denied

    const caller = await getCurrentUser()
    if (!caller) return { success: false, error: 'You must be signed in.' }

    // staff:WRITE lets you edit a colleague's details; changing what they can
    // *do* needs seniority as well. The staff form mirrors this, but the client
    // is not the enforcement point.
    const tooJunior = await assertCanManageAccess(caller.admin_level)
    if (tooJunior) return tooJunior

    const outranked = await assertOutranksTarget(profileId)
    if (outranked) return outranked

    const escalation = await assertNoEscalation(caller.admin_level, {
      access: (await keyed(overrides)) as Record<ModuleKey, AccessLevel>,
    })
    if (escalation) return escalation

    const admin = createAdminClient()

    const { data: target, error: targetError } = await admin
      .from('profiles')
      .select('admin_level')
      .eq('id', profileId)
      .single()

    if (targetError || !target) {
      return { success: false, error: 'Staff member not found.' }
    }

    // Super Admin is resolved unconditionally, so overrides on them are meaningless
    if (target.admin_level === 0) {
      return {
        success: false,
        error: 'Super Admin always has full access; overrides do not apply.',
      }
    }

    const defaults =
      target.admin_level === null ? {} : await getLevelPermissions(target.admin_level)

    const toStore = Object.entries(overrides)
      .map(([moduleId, access]) => ({
        module_id: Number(moduleId),
        access: toAccessLevel(access),
      }))
      .filter(row => row.access !== (defaults[row.module_id] ?? ACCESS.NONE))

    const keepIds = toStore.map(r => r.module_id)

    // Drop rows that now match the level default (or were removed outright)
    let deleteQuery = admin
      .from('profile_permission_overrides')
      .delete()
      .eq('profile_id', profileId)
    if (keepIds.length > 0) {
      deleteQuery = deleteQuery.not('module_id', 'in', `(${keepIds.join(',')})`)
    }
    const { error: deleteError } = await deleteQuery
    if (deleteError) {
      console.error('Error clearing permission overrides:', deleteError)
      return { success: false, error: deleteError.message }
    }

    if (toStore.length > 0) {
      const { data: written, error: upsertError } = await admin
        .from('profile_permission_overrides')
        .upsert(
          toStore.map(row => ({ ...row, profile_id: profileId })),
          { onConflict: 'profile_id,module_id' },
        )
        .select('module_id')
      if (upsertError) {
        console.error('Error saving permission overrides:', upsertError)
        return { success: false, error: upsertError.message }
      }
      // Never report success on a write that landed nothing
      if (written?.length !== toStore.length) {
        console.error('Permission overrides partially written:', { expected: toStore.length, written: written?.length })
        return { success: false, error: 'Access rights could not be saved. Please try again.' }
      }
    }

    revalidatePath('/staff')
    revalidatePath(`/staff/${profileId}`)
    return { success: true }
  } catch (err) {
    console.error('Error in setProfilePermissions:', err)
    return { success: false, error: 'Failed to save access rights' }
  }
}

/**
 * Update the default access map for one admin level.
 *
 * Affects every staff member on that level who has not overridden the module.
 */
export async function setLevelPermissions(
  adminLevel: number,
  access: Record<number, AccessLevel>,
): Promise<ActionResult> {
  try {
    const denied = await assertAccess(MODULES.SETTINGS, ACCESS.WRITE)
    if (denied) return denied

    const caller = await getCurrentUser()
    if (!caller) return { success: false, error: 'You must be signed in.' }

    const tooJunior = await assertCanManageAccess(caller.admin_level)
    if (tooJunior) return tooJunior

    if (adminLevel === 0) {
      return {
        success: false,
        error: 'Super Admin always has full access and cannot be edited.',
      }
    }

    const escalation = await assertNoEscalation(caller.admin_level, {
      adminLevel,
      access: (await keyed(access)) as Record<ModuleKey, AccessLevel>,
    })
    if (escalation) return escalation

    const admin = createAdminClient()
    const rows = Object.entries(access).map(([moduleId, value]) => ({
      admin_level: adminLevel,
      module_id: Number(moduleId),
      access: toAccessLevel(value),
    }))

    // An empty matrix would upsert nothing and still report success
    if (rows.length === 0) {
      return { success: false, error: 'No modules were submitted for this level.' }
    }

    const { data: written, error } = await admin
      .from('admin_level_permissions')
      .upsert(rows, { onConflict: 'admin_level,module_id' })
      .select('module_id')

    if (error) {
      console.error('Error saving level permissions:', error)
      return { success: false, error: error.message }
    }

    if (written?.length !== rows.length) {
      console.error('Level permissions partially written:', { expected: rows.length, written: written?.length })
      return { success: false, error: 'Access level could not be saved. Please try again.' }
    }

    revalidatePath('/settings/access-levels')
    revalidatePath('/staff')
    return { success: true }
  } catch (err) {
    console.error('Error in setLevelPermissions:', err)
    return { success: false, error: 'Failed to save access level' }
  }
}
