/** A small multipart email: encoded subject, cc, HTML with a script and a tracking pixel, one PDF attachment. */
export const SAMPLE_EML = [
  'Message-ID: <abc123@mail.example.com>',
  'Date: Tue, 27 Oct 2026 09:15:00 +0800',
  'From: "Mrs Chan" <mrs.chan@gmail.com>',
  'To: "Olivia Wong" <olivia.wong@academic-asia.com>, Team: a@x.com, b@y.com;',
  'Cc: dad.chan@gmail.com',
  'Subject: =?UTF-8?B?WWVhciA5IGVudHJ5IOKAkyBjb25maXJtZWQ=?=',
  'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="b1"',
  '',
  '--b1',
  'Content-Type: multipart/alternative; boundary="b2"',
  '',
  '--b2',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Hello Olivia, we confirm Year 9 entry.',
  '--b2',
  'Content-Type: text/html; charset=utf-8',
  '',
  '<p>Hello Olivia,<br>we <b>confirm</b> Year 9 entry.</p><script>alert(1)</script><img src="https://tracker.example.com/p.gif">',
  '--b2--',
  '--b1',
  'Content-Type: application/pdf; name="report.pdf"',
  'Content-Disposition: attachment; filename="report.pdf"',
  'Content-Transfer-Encoding: base64',
  '',
  'JVBERi0xLjQKJcfsj6IKMSAwIG9iago8PD4+CmVuZG9iagp0cmFpbGVyCjw8Pj4KJSVFT0YK',
  '--b1--',
  '',
].join('\r\n')

export const sampleBytes = () => new TextEncoder().encode(SAMPLE_EML)

export const OLE_HEADER = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0])
export const PDF_BYTES = new TextEncoder().encode('%PDF-1.4\n%\xe2\xe3\n1 0 obj\n<<>>\nendobj\n%%EOF\n')
