import { unstable_cache } from 'next/cache'
import { createAdminClient } from '../admin'

/** Tags on the cached lists; the actions that change these tables expire them. */
export const LIST_TAGS = {
  schools: 'lists:schools',
  events: 'lists:events',
  staff: 'lists:staff',
  lookups: 'lists:lookups',
} as const

type Admin = ReturnType<typeof createAdminClient>

/**
 * Caches a reference list on the server so pages stop re-querying it on every
 * request: statuses, courses, school names, staff names and the like.
 *
 * Only for tables every signed-in member of staff may read in full (their RLS
 * read policy is `authenticated` with `true`), so one copy serves everyone. It
 * reads with the secret key because a cached function has no request cookies,
 * so call it only from pages and routes behind sign-in.
 *
 * Fixed lookups change only with a migration, so they expire after an hour;
 * lists staff edit in the app also expire when edited (LIST_TAGS).
 */
export function cachedList<T>(key: string, tags: string[], load: (db: Admin) => Promise<T>, revalidate = 3600) {
  return unstable_cache(() => load(createAdminClient()), ['lists', key], { tags, revalidate })
}
