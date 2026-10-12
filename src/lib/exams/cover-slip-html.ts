import { escapeHtml } from '@/lib/pdf/escape-html'
import type { CoverSlip } from './cover-slip-shaping'

/**
 * Turns cover slips into one self-contained HTML document, one A4 page per
 * candidate, which the PDF renderer prints as it is. Everything is inline (no
 * images, fonts or network), and every value is escaped because names and
 * labels are typed in by staff.
 *
 * All layout decisions are in this file on purpose: the customer's own
 * template has not arrived yet, and adapting to it should touch nothing else.
 */

const CSS = `
@page { size: A4 portrait; margin: 18mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #000; background: #fff; }
.slip { break-after: page; }
.slip:last-child { break-after: auto; }
.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12mm; border-bottom: 0.6mm solid #000; padding-bottom: 6mm; }
.who { min-width: 0; }
.name, .code, td { overflow-wrap: anywhere; }
.kicker { font-size: 10pt; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 4mm; }
.name { font-size: 34pt; font-weight: 700; line-height: 1.1; margin: 0; }
.code { font-size: 13pt; margin: 2mm 0 0; }
.seat { border: 0.6mm solid #000; padding: 4mm 7mm; text-align: center; min-width: 42mm; }
.seat-label { font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 1mm; }
.seat-value { font-size: 30pt; font-weight: 700; margin: 0; white-space: nowrap; min-height: 12mm; }
table { width: 100%; border-collapse: collapse; margin-top: 10mm; }
th, td { text-align: left; vertical-align: top; padding: 4mm 0; border-bottom: 0.2mm solid #999; font-size: 15pt; }
th { width: 48mm; font-weight: 400; font-size: 10pt; letter-spacing: 0.08em; text-transform: uppercase; padding-top: 5.5mm; }
td.strong { font-weight: 700; }
.blank { display: inline-block; width: 70mm; border-bottom: 0.3mm solid #000; height: 7mm; }
.papers { margin: 0; padding: 0; list-style: none; }
.papers li { display: flex; justify-content: space-between; gap: 8mm; }
.papers li span:last-child { flex: none; white-space: nowrap; }
.papers li + li { margin-top: 2mm; }
.compact .name { font-size: 26pt; }
.compact table { margin-top: 6mm; }
.compact th, .compact td { padding: 2.2mm 0; font-size: 11pt; }
.compact th { font-size: 8pt; padding-top: 3mm; }
.compact .papers li + li { margin-top: 0.8mm; }
`

/** A4 minus the page margins, with some room to spare because the estimate below is rough. */
const COMFORTABLE_HEIGHT_MM = 222

/** Chinese, Japanese and Korean characters print about twice as wide as Latin ones. */
const WIDE_CHARACTER = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/

const printedWidth = (text: string) => [...text].reduce((width, character) => width + (WIDE_CHARACTER.test(character) ? 2 : 1), 0)

const lineCount = (text: string | null | undefined, charactersPerLine: number) =>
  Math.max(1, Math.ceil(printedWidth(text ?? '') / charactersPerLine))

/**
 * A slip has to stay on one sheet, because each sheet goes onto one seat. This
 * estimates how tall the slip would print at the normal type size, from how
 * many lines each part needs, and asks for the smaller setting when that would
 * not fit. The figures come from measuring rendered slips; they only need to
 * be right enough to choose between the two settings.
 */
export function needsCompactLayout(slip: CoverSlip): boolean {
  const header = 22 + lineCount(slip.studentName, 13) * 13 + (slip.studentCode ? 8 : 0)
  const rows = [slip.school, slip.date, slip.time, slip.room ?? '', slip.invigilators.join(', '), slip.assessment]
    .filter((value): value is string => value !== null)
    .reduce((height, value) => height + 8.5 + lineCount(value, 42) * 6.5, 0)
  const papers = slip.papers.length === 0
    ? 0
    : slip.papers.reduce((height, paper) => height + 2 + lineCount(paper.subject, 34) * 6.5, 8.5)
  return header + 10 + rows + papers > COMFORTABLE_HEIGHT_MM
}

/** A line to write on by hand, for a value nobody has entered yet. */
const BLANK = '<span class="blank"></span>'

function row(label: string, value: string, strong = false): string {
  return `<tr><th>${label}</th><td${strong ? ' class="strong"' : ''}>${value}</td></tr>`
}

function slipPage(slip: CoverSlip): string {
  const papers = slip.papers
    .map(paper => `<li><span>${escapeHtml(paper.subject)}</span><span>${paper.duration ? escapeHtml(paper.duration) : ''}</span></li>`)
    .join('')

  return `<section class="slip${needsCompactLayout(slip) ? ' compact' : ''}">
  <div class="top">
    <div class="who">
      <p class="kicker">Examination cover slip</p>
      <h1 class="name">${escapeHtml(slip.studentName)}</h1>
      ${slip.studentCode ? `<p class="code">${escapeHtml(slip.studentCode)}</p>` : ''}
    </div>
    <div class="seat">
      <p class="seat-label">Seat</p>
      <p class="seat-value">${slip.seat ? escapeHtml(slip.seat) : ''}</p>
    </div>
  </div>
  <table>
    ${slip.school ? row('School', escapeHtml(slip.school)) : ''}
    ${row('Date', escapeHtml(slip.date))}
    ${row('Start and end', escapeHtml(slip.time), true)}
    ${row('Room', slip.room ? escapeHtml(slip.room) : BLANK)}
    ${row('Invigilator', slip.invigilators.length > 0 ? escapeHtml(slip.invigilators.join(', ')) : BLANK)}
    ${slip.assessment ? row('Assessment', escapeHtml(slip.assessment)) : ''}
    ${papers ? row('Papers', `<ul class="papers">${papers}</ul>`) : ''}
  </table>
</section>`
}

export function coverSlipHtml(slips: CoverSlip[]): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Examination cover slip</title>
<style>${CSS}</style>
</head>
<body>${slips.map(slipPage).join('\n')}</body>
</html>`
}
