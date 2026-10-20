import { Badge } from "@/components/ui/badge"

/** One label/value pair; empty values show a dash. */
export function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "space-y-0.5 sm:col-span-2" : "space-y-0.5"}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="whitespace-pre-line break-words text-sm">{value || "—"}</div>
    </div>
  )
}

/** Icon-led group heading, shared by the field sections and the sub-record lists. */
export function SectionHead({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {count != null && <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">{count}</Badge>}
    </div>
  )
}

/** Titled box. Children are laid out as a two-column field grid unless `plain` is set. */
export function Section({ icon, title, count, plain, children }: {
  icon: React.ElementType
  title: string
  count?: number
  plain?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <SectionHead icon={icon} title={title} count={count} />
      {plain ? children : <div className="grid gap-4 sm:grid-cols-2">{children}</div>}
    </section>
  )
}
