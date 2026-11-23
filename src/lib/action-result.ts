/** What every server action returns: success, with data when it has any, or an error to show. */
export type ActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
  /** The record changed after the editor opened, so nothing was saved (stale-editor check). */
  conflict?: boolean
}
