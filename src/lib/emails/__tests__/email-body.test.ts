import { describe, it, expect } from 'vitest'
import { MAX_BODY_TEXT, htmlToText, limitBodyText, sanitizeEmailHtml } from '../email-body'
import { EMAIL_FRAME_SANDBOX, emailViewerDocument } from '../email-viewer-document'

describe('sanitizeEmailHtml', () => {
  it('removes scripts, event handlers, forms and frames', () => {
    const clean = sanitizeEmailHtml(
      '<p onclick="steal()">Hi</p><script>alert(1)</script><form action="https://x"><input></form><iframe src="https://x"></iframe><object data="x"></object>',
    )
    expect(clean).toBe('<p>Hi</p>')
  })

  it('drops remote and cid images so trackers never load, but keeps embedded data images', () => {
    const clean = sanitizeEmailHtml(
      '<img src="https://tracker.example.com/p.gif"><img src="cid:logo"><img src="data:image/png;base64,AAAA" alt="logo">',
    )
    expect(clean).toBe('<img src="data:image/png;base64,AAAA" alt="logo" />')
  })

  it('keeps safe links, opening them in a new tab, and strips javascript: links', () => {
    expect(sanitizeEmailHtml('<a href="https://school.example">site</a>'))
      .toBe('<a href="https://school.example" rel="noopener noreferrer" target="_blank">site</a>')
    expect(sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a rel="noopener noreferrer" target="_blank">x</a>')
    expect(sanitizeEmailHtml('<a href="//evil.example">x</a>')).not.toContain('evil.example')
  })

  it('keeps ordinary styles but drops url() values and properties outside the allow-list', () => {
    const clean = sanitizeEmailHtml(
      '<div style="color:red;background-image:url(https://t.example/p.gif);background-color:url(https://t.example/q);position:fixed;font-weight:bold">x</div>',
    )
    expect(clean).toBe('<div style="color:red;font-weight:bold">x</div>')
  })

  it('keeps the formatting and table layout emails rely on', () => {
    const html = '<table width="600" cellpadding="4"><tr><td style="color:red" align="center"><b>Offer</b></td></tr></table>'
    expect(sanitizeEmailHtml(html)).toBe(html)
  })
})

describe('htmlToText', () => {
  it('turns markup into readable lines and decodes entities once', () => {
    expect(htmlToText('<p>Dear Mrs&nbsp;Chan,</p><div>Fees &amp; dates</div>Line<br>break')).toBe('Dear Mrs Chan,\nFees & dates\nLine\nbreak')
    expect(htmlToText('<p>&amp;lt;tag&amp;gt;</p>')).toBe('&lt;tag&gt;')
  })
})

describe('limitBodyText', () => {
  it('passes normal text through and marks a cut on very long text', () => {
    expect(limitBodyText('short')).toBe('short')
    expect(limitBodyText(null)).toBeNull()
    const cut = limitBodyText('x'.repeat(MAX_BODY_TEXT + 10))!
    expect(cut.length).toBeLessThanOrEqual(MAX_BODY_TEXT)
    expect(cut).toMatch(/Download the original email for the rest/)
  })
})

describe('emailViewerDocument', () => {
  it('forbids network loads and scripts inside the frame', () => {
    const doc = emailViewerDocument('<p>Hi</p>')
    expect(doc).toContain(`content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"`)
    expect(doc).toContain('<body><p>Hi</p></body>')
    expect(EMAIL_FRAME_SANDBOX).not.toMatch(/allow-scripts|allow-same-origin/)
  })
})
