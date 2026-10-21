import { cn } from "@/lib/utils"

/**
 * Building blocks of the application page, in the visual language of the
 * scheduler screens: card surfaces with hairline borders, small uppercase
 * eyebrows instead of icon headings, and figures in tabular numerals.
 */

const eyebrowClass = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"

/** Uppercase section label with an optional count. */
export function Eyebrow({ children, count, as: Tag = "h2", className }: {
  children: React.ReactNode
  count?: number
  as?: "h2" | "h3" | "p"
  className?: string
}) {
  return (
    <Tag className={cn(eyebrowClass, className)}>
      {children}
      {count != null && <span className="ml-1.5 tabular-nums text-muted-foreground/70">{count}</span>}
    </Tag>
  )
}

/** One label/value pair inside a `<dl>`; empty values show a muted dash. */
export function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm">
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}

/** Card surface with an eyebrow. Children form a two-column field list unless `plain` is set. */
export function Section({ title, count, plain, children }: {
  title: string
  count?: number
  plain?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <Eyebrow count={count} className="mb-3">{title}</Eyebrow>
      {plain ? children : <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>}
    </section>
  )
}

/** A group inside a card, set off by a hairline so a long record reads as one list. */
export function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
      <Eyebrow as="h3">{title}</Eyebrow>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

/** Shown in place of a list with no rows. */
export function NoneYet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
