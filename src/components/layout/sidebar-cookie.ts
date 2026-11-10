/**
 * Cookie that remembers a narrowed sidebar, read by the dashboard layout so the
 * first paint already has the right width. Kept out of the client shell module:
 * a server component importing a value from a "use client" file gets a client
 * reference, not the string.
 */
export const SIDEBAR_COOKIE = "aa_sidebar"
