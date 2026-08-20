import type { Browser } from 'puppeteer-core'

/**
 * Render a self-contained HTML document to a PDF with headless Chromium.
 *
 * The HTML is passed in and set directly on the page — the browser never
 * navigates to the app. That matters for three reasons: the headless browser has
 * no session and would otherwise be bounced to /login by middleware; there is no
 * URL to smuggle in, so no SSRF surface; and the render cannot be affected by
 * whatever the app happens to serve at that moment.
 *
 * Chromium resolves differently on Vercel and on a developer machine, which is
 * the classic way this breaks in production only.
 *
 * Deliberately not marked 'server-only': importing puppeteer-core already makes
 * this impossible to bundle for the browser, and the marker would additionally
 * make the renderer untestable outside a Next server context — which is exactly
 * where the Chromium launch needs verifying.
 */

/**
 * Fluid Compute keeps instances warm across invocations, so the browser is
 * reused and only pages are opened and closed. A cold start pays the launch
 * cost once.
 */
let browserPromise: Promise<Browser> | null = null

async function launch(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core')

  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  // Locally, use whatever Chrome the developer already has installed rather
  // than shipping a second copy.
  return puppeteer.launch({
    channel: 'chrome',
    headless: true,
  })
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launch().catch((err) => {
      // Do not cache a failed launch, or every later request inherits it.
      browserPromise = null
      throw err
    })
  }
  const browser = await browserPromise
  if (!browser.connected) {
    browserPromise = null
    return getBrowser()
  }
  return browser
}

export interface RenderPdfOptions {
  landscape?: boolean
  /** Rendered bottom-right on every page. Not achievable from CSS in Chrome. */
  footerText?: string
}

export async function renderDocumentPdf(
  html: string,
  { landscape = false, footerText }: RenderPdfOptions = {}
): Promise<Uint8Array> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    // Everything is inline, so nothing is fetched; waiting on the network would
    // only add latency.
    await page.setContent(html, { waitUntil: 'load' })

    // Page geometry comes from the document's own @page rules; preferCSSPageSize
    // is what lets the landscape matrix print landscape from the same stylesheet.
    return await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      landscape,
      displayHeaderFooter: Boolean(footerText),
      headerTemplate: '<span></span>',
      footerTemplate: footerText
        ? `<div style="width:100%;font:7pt -apple-system,Helvetica,Arial,sans-serif;color:#6b7178;padding:0 14mm;display:flex;justify-content:space-between;">
             <span>${escapeHtml(footerText)}</span>
             <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
           </div>`
        : undefined,
      margin: footerText ? { bottom: '12mm' } : undefined,
    })
  } finally {
    await page.close()
  }
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
