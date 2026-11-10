import Link from "next/link"

export type Kpi = { label: string; value: number | null; note: string | null; href: string }

/** The few figures worth a daily look, side by side in one strip; each opens the page behind it. */
export function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  if (kpis.length === 0) return null
  return (
    <ul className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
      {kpis.map((kpi, i) => (
        <li key={kpi.label} className={i % 2 === 1 ? "border-l lg:border-l" : i > 0 ? "border-t lg:border-l lg:border-t-0" : undefined}>
          <Link href={kpi.href} className="block h-full px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5">
            <span className="block text-[13px] text-muted-foreground">{kpi.label}</span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {kpi.value === null ? "–" : kpi.value.toLocaleString("en-GB")}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{kpi.value === null ? "Could not be loaded" : kpi.note ?? " "}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
