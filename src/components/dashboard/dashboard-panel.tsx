import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A dashboard panel: a titled header bar over its content; the link on the right opens the full page. */
export function DashboardPanel({ title, link, children, className, flush = false }: {
  title: string
  link?: { href: string; label: string }
  children: ReactNode
  className?: string
  /** Content runs edge to edge (lists with their own row padding). */
  flush?: boolean
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-lg border bg-card", className)}>
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {link && (
          <Link href={link.href} className="shrink-0 text-xs font-medium text-muted-foreground hover:text-brand-navy">
            {link.label}
          </Link>
        )}
      </header>
      <div className={cn("flex-1", flush ? "py-1" : "p-4")}>{children}</div>
    </section>
  )
}
