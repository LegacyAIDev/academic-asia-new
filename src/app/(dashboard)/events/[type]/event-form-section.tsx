import type { ReactNode } from "react"

/** A titled part of the event form; the id lets other pages link straight to it (e.g. #schools). */
export function EventFormSection({ id, title, description, action, children }: {
  id?: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
