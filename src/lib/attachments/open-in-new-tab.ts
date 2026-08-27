/**
 * Open a URL in a new tab from a click handler that had to await first.
 *
 * `window.open` after an await loses the user-gesture attribution in Safari and
 * gets blocked; a synthetic anchor click does not. Signed URLs take a second or
 * two to come back, so every download here is a post-await open.
 */
export function openInNewTab(url: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
