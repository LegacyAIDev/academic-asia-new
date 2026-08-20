/**
 * Canonical storage paths for document buckets.
 *
 * Shape: {ownerId}/{categoryCode}/{disambiguator}_{safeName}
 *
 * Why category *code* and not category_id: the id is a numeric FK, so a reseed
 * or renumber silently makes every stored path describe the wrong category.
 * The code is stable and readable without a DB join.
 *
 * Why the disambiguator is caller-supplied: UI uploads pass a timestamp, while
 * bulk imports pass the legacy record id. A deterministic value lets an import
 * be re-run safely (same input, same path, upsert overwrites) instead of
 * creating duplicates on every retry.
 */

/** Strip anything that would need URL-encoding or break a storage key. */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export type DocumentPathParts = {
  /** students.id or schools.id — the uuid, never a legacy code. */
  ownerId: string
  /** document_categories.code, e.g. 'passport_copy'. */
  categoryCode: string
  /** Original filename, including extension. */
  fileName: string
  /** Uniqueness prefix: Date.now() for UI uploads, legacy id for imports. */
  disambiguator: string | number
}

export function buildDocumentPath({
  ownerId, categoryCode, fileName, disambiguator,
}: DocumentPathParts): string {
  return `${ownerId}/${categoryCode}/${disambiguator}_${sanitizeFileName(fileName)}`
}
