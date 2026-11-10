import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A titled block of the dashboard; the link on the right leads to the full page. */
export function DashboardPanel({ title, link, children, className }: {
  title: string
  link?: { href: string; label: string }
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border bg-card p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
        {link && (
          <Link href={link.href} className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
