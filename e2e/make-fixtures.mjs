/**
 * Writes the exam paper files the paper-versions suite uploads: three small
 * PDFs whose text reads "English paper version N", so a test can tell which
 * version a download returned. Usage: node e2e/make-fixtures.mjs <folder>
 * (email-filing's .eml/.msg fixtures are real mail files and are not generated).
 */
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2] ?? '/tmp/aa-localdb/fixtures'
fs.mkdirSync(dir, { recursive: true })

function pdf(text) {
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let body = '%PDF-1.4\n'
  const offsets = objects.map((obj, i) => {
    const offset = body.length
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
    return offset
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  body += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return body
}

for (const n of [1, 2, 3]) fs.writeFileSync(path.join(dir, `english-v${n}.pdf`), pdf(`English paper version ${n}`))
console.log(`exam paper fixtures written to ${dir}`)
