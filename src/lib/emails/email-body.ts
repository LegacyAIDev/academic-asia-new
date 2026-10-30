import 'server-only'
import sanitizeHtml from 'sanitize-html'

/**
 * Cleans an email's body before it is stored. Email HTML comes from outside the
 * company, so scripts, forms, frames and event handlers are removed, links can
 * only be http(s) or mailto, and images survive only when embedded as data:
 * URIs, which means a remote tracking pixel never loads. The viewer adds a
 * second wall: the body is shown in a sandboxed frame with a strict policy.
 */

export const MAX_BODY_TEXT = 200_000
export const MAX_BODY_HTML = 1_000_000

const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'center', 'code', 'col', 'colgroup', 'dd', 'del', 'div',
  'dl', 'dt', 'em', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'li', 'ol', 'p',
  'pre', 's', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'u', 'ul',
]

const LAYOUT_ATTRIBUTES = ['align', 'valign', 'width', 'height', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan']

/**
 * Style properties an email may keep. Anything else (background-image,
 * position, behaviour hacks) is dropped, and no kept value may contain url(),
 * so the body stays safe even if it is ever shown outside the sandboxed frame.
 */
const NO_URL = /^(?!.*(url|expression)\s*\().*$/i
const ALLOWED_STYLES = Object.fromEntries([
  'color', 'background-color', 'font', 'font-family', 'font-size', 'font-style', 'font-weight', 'line-height',
  'text-align', 'text-decoration', 'text-transform', 'letter-spacing', 'white-space', 'vertical-align', 'display',
  'width', 'max-width', 'min-width', 'height', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border', 'border-top', 'border-right',
  'border-bottom', 'border-left', 'border-color', 'border-style', 'border-width', 'border-collapse', 'border-radius',
].map(property => [property, [NO_URL]]))

export function sanitizeEmailHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': ['style', 'title', 'dir', 'lang', ...LAYOUT_ATTRIBUTES],
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt'],
      font: ['color', 'face', 'size'],
    },
    allowedStyles: { '*': ALLOWED_STYLES },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['data'] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
    // A remote or cid: image loses its src, which leaves an empty tag; drop it.
    exclusiveFilter: frame => frame.tag === 'img' && !frame.attribs.src,
  })
  return clean.length > MAX_BODY_HTML ? '' : clean
}

/** Plain text of an HTML body, for search and for emails that arrive without a text part. */
export function htmlToText(html: string): string {
  return sanitizeHtml(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n'), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;| /g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Last, so an escaped "&amp;lt;" becomes the text "&lt;", not "<".
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Body text kept within the column limit; a cut is marked so nobody mistakes it for the whole email. */
export function limitBodyText(text: string | null): string | null {
  if (!text) return null
  if (text.length <= MAX_BODY_TEXT) return text
  return `${text.slice(0, MAX_BODY_TEXT - 80)}\n\n[Text shortened here. Download the original email for the rest.]`
}
