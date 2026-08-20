/**
 * Selected School List - document stylesheet, as a string.
 *
 * Held as a module rather than a .css import because the same styles are needed
 * in two places that cannot share a stylesheet link: the on-screen page, and the
 * server-side PDF route, which renders with page.setContent() and so has no
 * stylesheet to load. One exported string guarantees the printed PDF and the
 * on-screen document are byte-identical.
 *
 * Ported from the verified print prototype at
 * plans/reports/schools-export-design-prototype.html. The measurements, the
 * decimal rail, the tabular figures and the page-break rules were checked by
 * rendering to PDF at A4 in both orientations and again desaturated for mono
 * printing - treat them as settled and change them only against a fresh render.
 */

export const EXPORT_DOCUMENT_CSS = `/* ══════════════════════════════════════════════════════════════════════════
   ACADEMIC ASIA · SELECTED SCHOOL LIST
   Print-first document. Two candidate layouts in one file.
   No external assets. Measurements in mm/pt so screen ≈ print.
   ══════════════════════════════════════════════════════════════════════════ */
:root{
  /* Ink ramp. Every value is >=4.5:1 on white. De-emphasis is done with
     SIZE and LETTER-SPACING, never by dropping contrast below AA. */
  --ink:    #14181d;   /* primary text, all figures         */
  --ink-2:  #40464e;   /* secondary text, prior year        */
  --ink-3:  #6b7178;   /* field labels, NP, footnotes ~5.2:1 */
  --rule:   #9ea4ab;   /* structural hairlines              */
  --rule-2: #d5d9dd;   /* inner separators                  */
  --paper:  #ffffff;
  --accent: #8c1d2a;   /* oxblood, from the AA logo bar.
                          Decorative + one legended marker.
                          Reads as dark grey in mono.       */
  --serif: "Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",
           "URW Palladio L",Georgia,"Times New Roman",serif;
  --sans:  "Helvetica Neue",Helvetica,Arial,"Liberation Sans","Nimbus Sans",
           "Segoe UI",sans-serif;
  --idw: 64mm;         /* identity column — fixes the results rail */
}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#e9ebed;color:var(--ink);font-family:var(--sans);
  font-size:8pt;line-height:1.35;-webkit-font-smoothing:antialiased}

/* Every figure is tabular + lining. This is what lets a reader scan a column. */
table,.n,.val,.fig{font-variant-numeric:tabular-nums lining-nums;
  font-feature-settings:"tnum" 1,"lnum" 1}

/* ── Decimal-aligned figure ────────────────────────────────────────────────
   Schools publish mixed precision (100, 45.4, 76.2). Plain right-alignment
   stacks "100" against the ".4" of "45.4". This splits every figure into an
   integer track (right-aligned) and a fixed fraction track (left-aligned),
   so the decimal point holds one rail down the whole column. NP and — ride
   the same rail. */
.n{display:grid;grid-template-columns:1fr 2.7mm}
.n>i{text-align:right;font-style:normal}
.n>u{text-align:left;text-decoration:none}

/* ── Sheet simulation ─────────────────────────────────────────────────── */
.sheet{background:var(--paper);margin:0 auto 26px;width:210mm;min-height:297mm;
  padding:14mm 14mm 15mm;box-shadow:0 1px 2px rgba(0,0,0,.10),0 12px 32px rgba(0,0,0,.13)}
.sheet--land{width:297mm;min-height:210mm;padding:9mm 14mm 8mm}

/* ══ MASTHEAD ═══════════════════════════════════════════════════════════ */
.masthead{margin-bottom:4.5mm}
.mast-top{display:flex;align-items:flex-end;justify-content:space-between;gap:10mm}
.wordmark{font-family:var(--serif);font-size:16pt;line-height:1;letter-spacing:.14em;
  color:var(--ink);white-space:nowrap}
.wordmark .sp{letter-spacing:0;padding:0 .16em}
.tagline{font-family:var(--serif);font-style:italic;font-size:7.5pt;color:var(--ink-2);
  margin-top:1.5mm}
.doctitle{text-align:right}
.doctitle .t{font-size:9pt;font-weight:700;letter-spacing:.20em;text-transform:uppercase;
  white-space:nowrap}
.doctitle .s{font-size:7pt;color:var(--ink-3);letter-spacing:.04em;margin-top:1.1mm}
.mast-rule{margin-top:2.8mm;border-top:.7mm solid var(--accent)}
.mast-rule-thin{border-top:.2mm solid var(--ink);margin-top:.5mm}
.mast-meta{display:flex;gap:8mm;padding-top:2.2mm}
.mfield.grow{flex:1}
.mfield .l{font-size:5.6pt;letter-spacing:.17em;text-transform:uppercase;color:var(--ink-3);
  font-weight:700;margin-bottom:.6mm}
.mfield .v{font-size:8.5pt}
.mfield .v.name{font-family:var(--serif);font-size:10pt}

/* ══ LAYOUT A — STACKED PROFILES ════════════════════════════════════════
   The roster is a real <table> for one reason: browsers repeat <thead> on
   every printed page, so the column key reappears after a page break.     */
table.roster{width:100%;border-collapse:collapse}
table.roster>thead>tr>th{padding:0;font-weight:400;text-align:left}
table.roster>tbody>tr>td{padding:0}
table.roster>tbody>tr{break-inside:avoid;page-break-inside:avoid}

.keybar{display:grid;grid-template-columns:var(--idw) 1fr;margin-bottom:1.2mm}
.keybar .spacer{font-size:5.6pt;letter-spacing:.17em;text-transform:uppercase;
  color:var(--ink-3);font-weight:700;align-self:end;padding-bottom:1mm}

table.grid{width:100%;border-collapse:collapse;table-layout:fixed}
table.grid col.c-year{width:8mm}
table.grid col.c-g{width:9mm}
table.grid col.c-gap{width:3mm}
table.grid col.c-a{width:9.4mm}
table.grid col.c-ib{width:12mm}

.grp{font-size:5.6pt;letter-spacing:.17em;text-transform:uppercase;font-weight:700;
  color:var(--ink-3);text-align:center;padding:0 0 .8mm;border-bottom:.2mm solid var(--rule)}
.grp .unit{font-weight:400;letter-spacing:.06em;text-transform:none}
.thr{font-size:6.2pt;font-weight:700;color:var(--ink);padding:1mm .6mm .8mm 0;white-space:nowrap}
.thr .n>i{padding-right:0}
.keybar .thr{border-bottom:.2mm solid var(--ink)}
.keybar .grp-gap,.keybar .thr-gap{border-bottom:0}

/* ── School block: three horizontal bands ─────────────────────────────────
   1  identity  |  results        2  profile strip        3  fees + refs
   Banding keeps the block short, so the results rail is never floating in
   whitespace beside a tall stack of labels — the flaw in a two-column
   arrangement where one side is 9 lines and the other is 2.               */
.school{padding:2.4mm 0 2.2mm;border-bottom:.2mm solid var(--rule-2);
  break-inside:avoid;page-break-inside:avoid}
table.roster>tbody>tr:last-child .school{border-bottom:.2mm solid var(--ink)}
.row-main{display:grid;grid-template-columns:var(--idw) 1fr;align-items:start}
.ident{padding-right:5mm}
.idx{font-family:var(--serif);font-size:11pt;color:var(--accent);line-height:1;
  float:left;width:8mm;letter-spacing:.02em}
.sname{font-family:var(--serif);font-size:11.5pt;line-height:1.14;font-weight:400;
  margin:0;letter-spacing:.005em;hyphens:none;overflow-wrap:break-word}
.sloc{font-size:7pt;color:var(--ink-2);margin:.8mm 0 0 8mm}

.yr-lab{font-size:6.4pt;font-weight:700;color:var(--ink-3);text-align:left;
  padding:.85mm 1.2mm .85mm 0;letter-spacing:.04em}
tr.now .yr-lab{color:var(--ink)}
.val{padding:.85mm .6mm}
.val .n{font-size:8.4pt;color:var(--ink-2)}
/* Current year carries the weight. This hierarchy replaces the legacy's
   grey shaded block as the grouping signal. */
tr.now .val .n{font-weight:700;color:var(--ink);font-size:8.6pt}
tr.now td{border-top:.15mm solid var(--rule-2)}
.gap{padding:0}
.gap-rule{border-left:.15mm solid var(--rule-2)}

/* Two distinct missing-data states, which the legacy conflated as blank. */
.np,.na{font-weight:400!important;color:var(--ink-3)!important}
.np{font-size:5.8pt!important;letter-spacing:.09em;vertical-align:.35mm}
.na{font-size:7.4pt!important}

/* Band 2 — profile strip */
.strip{margin-left:8mm;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 4mm}
.strip-facts{margin-top:2mm;padding-top:1.4mm;border-top:.15mm solid var(--rule-2)}
.strip .cat{font-size:6pt;letter-spacing:.13em;text-transform:uppercase;font-weight:700;
  color:var(--ink)}
.strip .cat .sep{color:var(--rule);font-weight:400;padding:0 .3em}
.f{display:flex;align-items:baseline;gap:1mm;white-space:nowrap}
.f .l{font-size:5.5pt;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-3);
  font-weight:700}
.f .v{font-size:7.6pt;color:var(--ink)}
/* Boarding proportion — derived (boarders/pupils). Surfaces what the legacy
   buried: Harrow is 100% boarding, Abingdon 13%. Mono-safe: solid ink fill
   in a hairline track. */
.prop{width:12mm;height:1.2mm;border:.15mm solid var(--rule);background:var(--paper);
  align-self:center}
.prop i{display:block;height:100%;background:var(--ink)}

/* Band 3 — fees + references */
.strip-fee{margin-top:1.6mm;justify-content:space-between;gap:0 5mm}
.fee-l{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 3mm}
.fee-l .cap{font-size:5.5pt;letter-spacing:.13em;text-transform:uppercase;font-weight:700;
  color:var(--ink)}
.fee-l .cap em{font-style:normal;font-weight:400;color:var(--ink-3);letter-spacing:.05em}
.band{display:flex;align-items:baseline;gap:1.4mm;white-space:nowrap}
.band+.band{padding-left:3mm;border-left:.15mm solid var(--rule-2)}
.band .yr{font-size:6.8pt;color:var(--ink-2)}
.band .amt{font-size:9pt;font-weight:700;color:var(--ink)}
.refs{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 3.5mm;font-size:6.6pt;
  text-align:right}
.refs .k{font-size:5.4pt;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);
  font-weight:700;margin-right:.8mm}
.refs a{color:var(--ink);text-decoration:none;border-bottom:.15mm solid var(--rule)}
.refs .remark{color:var(--ink-2);font-style:italic}
.refs .remark .k{font-style:normal}

/* ══ LAYOUT B — COMPARISON MATRIX ═══════════════════════════════════════ */
table.matrix{width:100%;border-collapse:collapse;table-layout:fixed}
table.matrix col.c-lab{width:50mm}
/* Set per render from the school count: (269mm usable - 50mm label) / n.
   At five schools this resolves to the 43.8mm the layout was tuned at; fewer
   schools widen to fill the page rather than leaving it half empty. */
table.matrix col.c-sch{width:var(--mx-col-w,43.8mm)}
table.matrix thead th{padding:0;text-align:left;font-weight:400;vertical-align:bottom}
.mx-head{padding:0 2mm 1mm 0}
.mx-head .idx{float:none;width:auto;font-size:8.5pt;display:block;margin-bottom:.6mm}
/* Names sit on a shared baseline whatever their length: the box reserves two
   lines and content is bottom-aligned. */
/* The box reserves two lines so names sit on a shared baseline whatever their
   length, and is capped at two so one pathological name cannot push the matrix
   onto a second page. A handful of records carry an internal annotation in the
   name ("... (New name from Sept 2026: ...)"); those clip here, and Layout A
   shows them in full. */
.mx-name{font-family:var(--serif);font-size:10.5pt;line-height:1.14;min-height:6mm;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  align-items:flex-end}
.mx-loc{font-size:6.6pt;color:var(--ink-2);margin-top:.7mm}
.mx-web{font-size:6.2pt;color:var(--ink-3);margin-top:.3mm}
.mx-web .url{word-break:break-all}
.mx-web .nb{white-space:nowrap}
.mx-web a{color:var(--ink-3);text-decoration:none;white-space:nowrap;
  border-bottom:.15mm solid var(--rule-2)}
th.mx-col{border-bottom:.4mm solid var(--ink);border-left:.15mm solid var(--rule-2);
  padding-left:2mm}
th.mx-corner{border-bottom:.4mm solid var(--ink)}
.mx-corner .cap{font-size:5.6pt;letter-spacing:.17em;text-transform:uppercase;font-weight:700;
  color:var(--ink-3);padding-bottom:1.4mm}
/* Year sub-header: declared once, obeyed by every figure below. */
tr.mx-years th{border-bottom:.15mm solid var(--rule);border-left:.15mm solid var(--rule-2);
  padding:.7mm 0 .7mm 2mm}
tr.mx-years th.mx-corner{border-left:0;border-bottom:.15mm solid var(--rule)}
.yy{display:grid;grid-template-columns:1fr 1fr}
.yy span{text-align:right;padding-right:2.4mm;font-size:5.8pt;font-weight:700;
  letter-spacing:.11em;color:var(--ink-3)}
.yy span.now{color:var(--ink)}

table.matrix tbody th{text-align:left;font-weight:400;font-size:7.3pt;color:var(--ink-2);
  padding:.55mm 3mm .55mm 0;border-bottom:.15mm solid var(--rule-2);vertical-align:top}
table.matrix tbody td{padding:.55mm 2mm .55mm 2mm;font-size:8pt;vertical-align:top;
  border-bottom:.15mm solid var(--rule-2);border-left:.15mm solid var(--rule-2)}
table.matrix tbody tr{break-inside:avoid;page-break-inside:avoid}
/* Section band: a rule and small caps. No grey fill anywhere in this document. */
tr.band-row th,tr.band-row td{border-bottom:0;padding-top:1.2mm;padding-bottom:.5mm}
tr.band-row td{white-space:nowrap}
tr.band-row th{font-size:5.8pt;letter-spacing:.17em;text-transform:uppercase;font-weight:700;
  color:var(--ink);border-bottom:.2mm solid var(--ink)}
tr.band-row td{border-bottom:.2mm solid var(--ink);border-left:0}
tr.band-row .unit{font-weight:400;letter-spacing:.05em;text-transform:none;color:var(--ink-3);
  font-size:6.4pt}

.pair{display:grid;grid-template-columns:1fr 1fr}
.pair>span{padding-right:2.4mm}
.pair .p24 .n{font-size:7.4pt;color:var(--ink-2)}
.pair .p25 .n{font-size:8.4pt;font-weight:700;color:var(--ink)}
/* Highest current-year figure in the row. Mono-safe, legended, and
   suppressed when only one school published — an unopposed number is not
   a comparison. */
.pair .p25.lead .n>i,
.pair .p25.lead .n>u:not(:empty){box-shadow:inset 0 -.4mm 0 0 var(--accent)}

.mx-fee div{display:flex;align-items:baseline;gap:1.4mm;white-space:nowrap}
.mx-fee .amt{font-size:8.6pt;font-weight:700}
.mx-fee .yr{font-size:6pt;color:var(--ink-3)}
.mx-fee .b2{margin-top:.7mm;padding-top:.7mm;border-top:.15mm dotted var(--rule)}
.mx-note{font-size:6.8pt;color:var(--ink-2);font-style:italic}
.mx-num{font-size:8.6pt;font-weight:700}
.mx-sub{font-size:6pt;color:var(--ink-3);letter-spacing:.04em}
.mx-prop{margin-top:.9mm;height:1.2mm;border:.15mm solid var(--rule);background:var(--paper)}
.mx-prop i{display:block;height:100%;background:var(--ink)}
.mx-link a{color:var(--ink);text-decoration:none;border-bottom:.15mm solid var(--rule);
  font-size:6.8pt}

/* ══ FOOTER ═════════════════════════════════════════════════════════════ */
.docfoot{margin-top:4mm;break-inside:avoid}
.docfoot .legend{display:flex;gap:6mm;flex-wrap:wrap;font-size:6.2pt;color:var(--ink-3);
  padding-bottom:1.8mm;border-bottom:.2mm solid var(--rule)}
.docfoot .legend b{color:var(--ink);font-weight:700}
.docfoot .thanks{margin:2.2mm 0 0;font-family:var(--serif);font-size:8.4pt;line-height:1.5}
.docfoot .small{margin:1.4mm 0 0;font-size:6.4pt;color:var(--ink-3);line-height:1.5}
.doc--b .masthead{margin-bottom:3mm}
.doc--b .mast-rule{margin-top:2.2mm}
.docfoot--tight{margin-top:2mm}
.docfoot--tight .legend{font-size:6pt;padding-bottom:1.2mm;gap:0 4.5mm}
.docfoot--tight .legend .sig-inline{margin-left:auto;letter-spacing:.13em;
  text-transform:uppercase;font-size:5.8pt}
.docfoot--tight .thanks{font-size:7.6pt;margin-top:1.3mm;line-height:1.45}
.docfoot--tight .small{display:inline;margin:0;font-size:6.3pt}
.docfoot .sig{margin-top:2.6mm;padding-top:1.4mm;border-top:.15mm solid var(--rule-2);
  display:flex;justify-content:space-between;font-size:5.8pt;letter-spacing:.13em;
  text-transform:uppercase;color:var(--ink-3)}

/* ══ PRINT ══════════════════════════════════════════════════════════════ */
@page{size:A4 portrait;margin:14mm 14mm 15mm}
/* Named page: Layout B prints landscape from the same document.
   Chrome/Edge 110+ and Safari 16.4+ honour \`page:\`. Firefox ignores it and
   will print Layout B portrait; Layout A is unaffected. */
@page land{size:A4 landscape;margin:9mm 14mm 8mm}
@media print{
  body{background:#fff}
  /* The dashboard shell has no place on a printed document. */
  .no-print{display:none!important}
  .export-stage{padding:0!important}
  .sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
  .doc--b{page:land}
  .school,table.roster>tbody>tr,.docfoot,table.matrix tbody tr{
    break-inside:avoid!important;page-break-inside:avoid!important}
  /* Repeat the column key at the top of every continuation page. */
  table.roster>thead,table.matrix>thead{display:table-header-group}
  .masthead{break-after:avoid;page-break-after:avoid}
  a{color:var(--ink)}
}
/* No motion is used anywhere: this is a printable record, not an interface. */
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
/* Layout B has to land on a single landscape page - a comparison split across a
   page boundary is not a comparison. Its rows are therefore a little tighter
   than Layout A, which has a full page for every few schools. Measured: this
   brings a 24-row matrix from ~198mm to ~189mm against 193mm of usable height. */
.doc--b table.matrix tbody th,
.doc--b table.matrix tbody td{padding-top:.35mm;padding-bottom:.35mm}
.doc--b tr.band-row th,
.doc--b tr.band-row td{padding-top:.9mm;padding-bottom:.35mm}
`
