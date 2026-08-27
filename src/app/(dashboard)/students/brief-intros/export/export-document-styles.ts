/**
 * Brief Introduction — document stylesheet, as a string.
 *
 * Held as a module rather than a .css import for the same reason the school
 * export does it: the PDF route renders with page.setContent() and so has no
 * stylesheet to link. One exported string keeps the on-screen preview and the
 * printed file identical.
 *
 * The ink ramp and type stack are deliberately the same values as
 * schools/export/export-document-styles.ts — the two documents go out to the
 * same schools, often in the same envelope, and should read as one house.
 */

export const BRIEF_INTRO_DOCUMENT_CSS = `/* ══════════════════════════════════════════════════════════════════════
   ACADEMIC ASIA · BRIEF INTRODUCTION
   Print-first. One student per page. No external assets.
   ══════════════════════════════════════════════════════════════════════ */
:root{
  --ink:    #14181d;
  --ink-2:  #40464e;
  --ink-3:  #6b7178;
  --rule:   #9ea4ab;
  --rule-2: #d5d9dd;
  --paper:  #ffffff;
  --accent: #8c1d2a;
  --serif: "Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",
           "URW Palladio L",Georgia,"Times New Roman",serif;
  --sans:  "Helvetica Neue",Helvetica,Arial,"Liberation Sans","Nimbus Sans",
           "Segoe UI",sans-serif;
}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#e9ebed;color:var(--ink);font-family:var(--sans);
  font-size:10pt;line-height:1.45;-webkit-font-smoothing:antialiased}

/* Deeper bottom margin than top: the PDF route prints a page-number footer
   into that band, and text running under it reads as a printing fault. */
@page{size:A4 portrait;margin:16mm 14mm 15mm}

/* ── Sheet ─────────────────────────────────────────────────────────────
   Simulated on screen; in print the @page box takes over and the padding
   is dropped so the margin is not applied twice. */
.sheet{background:var(--paper);width:210mm;min-height:297mm;
  margin:0 auto 26px;padding:16mm 14mm;box-shadow:0 1px 4px rgba(0,0,0,.18)}

/* Every introduction after the first opens a new page. Using break-BEFORE
   rather than break-after avoids a trailing blank page on the last one. */
.intro + .intro{break-before:page}

/* ── Masthead ──────────────────────────────────────────────────────── */
.masthead{border-bottom:1.5pt solid var(--accent);padding-bottom:3mm;
  margin-bottom:6mm}
.masthead-agency{font-family:var(--serif);font-size:15pt;letter-spacing:.02em;
  color:var(--accent);margin:0}
.masthead-title{font-size:8pt;text-transform:uppercase;letter-spacing:.16em;
  color:var(--ink-3);margin:1mm 0 0}
.masthead-meta{display:flex;justify-content:space-between;gap:6mm;
  margin-top:2.5mm;font-size:7.5pt;color:var(--ink-3)}

/* ── Student header ────────────────────────────────────────────────── */
.student{margin-bottom:5mm}
.student-name{font-family:var(--serif);font-size:16pt;margin:0;line-height:1.2}
.student-code{font-size:8pt;color:var(--ink-3);letter-spacing:.08em;
  text-transform:uppercase;margin:1mm 0 0;
  font-variant-numeric:tabular-nums lining-nums}

/* ── Fields ────────────────────────────────────────────────────────────
   break-inside:avoid keeps a label from being orphaned at a page foot from
   the value it describes. */
.field{margin-bottom:5mm;break-inside:avoid}
.field-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:.12em;
  color:var(--ink-3);margin:0 0 1.5mm;padding-bottom:1mm;
  border-bottom:.5pt solid var(--rule-2)}
.field-value{margin:0;white-space:pre-wrap}
.field-value.empty{color:var(--ink-3)}

/* Two short facts sit side by side; everything else runs full width. */
.field-pair{display:grid;grid-template-columns:1fr 1fr;gap:6mm}

/* ── Rich text from the editor ─────────────────────────────────────── */
.rich p{margin:0 0 2.5mm}
.rich p:last-child{margin-bottom:0}
.rich ul,.rich ol{margin:0 0 2.5mm;padding-left:5mm}
.rich li{margin-bottom:1mm}
.rich h1,.rich h2,.rich h3{font-family:var(--serif);font-size:11pt;
  margin:0 0 2mm}
.rich a{color:var(--ink);text-decoration:underline}
.rich img{max-width:100%;height:auto}
.rich blockquote{margin:0 0 2.5mm;padding-left:4mm;
  border-left:2pt solid var(--rule-2);color:var(--ink-2)}

@media print{
  body{background:var(--paper)}
  .sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
}
`
