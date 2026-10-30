/**
 * The document shown inside the viewer's sandboxed frame. The stored HTML is
 * already sanitised; this policy is the second wall: nothing may load from the
 * network (so a tracking pixel or a CSS background URL cannot report that the
 * email was opened) and no script can run. Links still open in a new tab.
 */

const POLICY = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"

const BASE_STYLE = [
  'body{margin:0;padding:16px;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1f2937;background:#fff;word-wrap:break-word}',
  'img{max-width:100%;height:auto}',
  'table{max-width:100%}',
  'pre{white-space:pre-wrap}',
  'blockquote{margin:0 0 0 8px;padding-left:12px;border-left:3px solid #e5e7eb;color:#4b5563}',
].join('')

export function emailViewerDocument(html: string): string {
  return '<!doctype html><html><head><meta charset="utf-8">'
    + `<meta http-equiv="Content-Security-Policy" content="${POLICY}">`
    + `<base target="_blank"><style>${BASE_STYLE}</style></head><body>${html}</body></html>`
}

/**
 * Sandbox flags for the frame: no scripts and no same-origin access, so the
 * email cannot touch the app; popups are allowed only so links open in a tab.
 */
export const EMAIL_FRAME_SANDBOX = 'allow-popups allow-popups-to-escape-sandbox'
