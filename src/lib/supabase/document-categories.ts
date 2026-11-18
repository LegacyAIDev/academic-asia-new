import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves document_categories.id -> code for storage path building.
 *
 * The table is tiny (under 20 rows) and effectively static, so it is cached for
 * the lifetime of the server process rather than re-queried on every upload.
 * A miss reloads it once, so a category added by a migration is found without
 * a restart.
 */
let cache: Map<number, string> | null = null

async function load(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.from('document_categories').select('id, code')
  if (data) cache = new Map(data.map((c: { id: number; code: string }) => [c.id, c.code]))
}

export async function getCategoryCode(
  supabase: SupabaseClient,
  categoryId: number
): Promise<string> {
  if (!cache?.has(categoryId)) await load(supabase)
  // 'other' keeps a file reachable rather than failing the upload outright.
  return cache?.get(categoryId) ?? 'other'
}

/**
 * Resolves document_categories.code -> id.
 *
 * Lets callers name a category by its stable code instead of hardcoding a
 * numeric id that a reseed can silently invalidate.
 */
export async function getCategoryId(
  supabase: SupabaseClient,
  code: string
): Promise<number | null> {
  const find = () => { for (const [id, c] of cache ?? []) if (c === code) return id; return null }
  const hit = find()
  if (hit !== null) return hit
  await load(supabase)
  return find()
}

/** Drop the cache — call after seeding or changing categories. */
export function clearCategoryCodeCache(): void {
  cache = null
}
