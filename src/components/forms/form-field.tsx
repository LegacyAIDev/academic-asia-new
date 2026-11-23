import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"

/** A labelled field inside a record form pop-up; `required` adds the red star. */
export function FormField({ label, children, required = false, className = "" }: {
  label: string
  children: ReactNode
  required?: boolean
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}
