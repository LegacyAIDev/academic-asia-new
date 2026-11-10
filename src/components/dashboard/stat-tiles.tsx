import Link from "next/link"
import type { LucideIcon } from "lucide-react"

export type StatTile = { label: string; value: number | null; href: string; hint: string; icon: LucideIcon }

/** Real counts, each opening the page behind it. A count that could not be read says so instead of showing 0. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  if (tiles.length === 0) return null
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {tiles.map(({ label, value, href, hint, icon: Icon }) => (
        <li key={label}>
          <Link href={href} className="group flex h-full items-start gap-4 rounded-xl border bg-card p-4 sm:p-5 transition-colors hover:border-primary/30 hover:bg-muted/30">
            <span className="hidden h-10 w-10 shrink-0 items-center sm:flex justify-center rounded-lg bg-brand-navy/[0.06] text-brand-navy">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-muted-foreground">{label}</span>
              <span className="mt-0.5 block text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {value === null ? "–" : value.toLocaleString("en-GB")}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground group-hover:text-primary">
                {value === null ? "Could not be loaded" : hint}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
