import type { ElementType, ReactNode } from "react"

/**
 * A titled group of fields inside a form pop-up. Plain heading and spacing, no
 * card or coloured badge, so a long form reads as one calm sheet.
 * `accentColor` is accepted for older call sites and ignored.
 */
export function FormSection({ icon: Icon, title, children }: {
  icon?: ElementType
  title: string
  children: ReactNode
  accentColor?: string
}) {
  return (
    <fieldset className="min-w-0 rounded-lg border bg-card p-4">
      <legend className="sr-only">{title}</legend>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground" aria-hidden="true">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}
