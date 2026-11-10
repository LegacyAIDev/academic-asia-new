import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A titled panel: a header bar (title, optional count, an action or link on
 * the right) over its content. The one section style across the app.
 */
export function Panel({ title, count, link, action, children, className, flush = false, id }: {
  title: string
  count?: number
  link?: { href: string; label: string }
  /** A button for the header bar (e.g. "Add visa"). */
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Content runs edge to edge (tables and lists with their own padding). */
  flush?: boolean
  id?: string
}) {
  return (
    <section id={id} className={cn("flex min-w-0 flex-col rounded-lg border bg-card", className)}>
      <header className="flex min-h-12 items-center justify-between gap-4 border-b px-4 py-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-px text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
          )}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {link && (
            <Link href={link.href} className="text-xs font-medium text-muted-foreground hover:text-brand-navy">{link.label}</Link>
          )}
          {action}
        </div>
      </header>
      <div className={cn("flex-1", flush ? "py-1" : "p-4")}>{children}</div>
    </section>
  )
}

/** What a panel shows when it holds nothing yet: what goes here, and the button to add the first one. */
export function PanelEmpty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
