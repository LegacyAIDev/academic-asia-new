const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ids from URLs end up in database filters, so anything that is not a uuid is dropped first. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
