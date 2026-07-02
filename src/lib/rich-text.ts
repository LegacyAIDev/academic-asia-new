import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize rich text (brief intro, resume profile, …) before storing. Allows
 * only the formatting, links and images the editor can produce, stripping any
 * unsafe markup so the stored HTML is safe to render directly.
 *
 * Server-only: imports sanitize-html, so keep it out of client components.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 's', 'strike', 'u',
      'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  })
}
