import type { ComponentProps, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** One labelled field of the sign-in pages: large enough to read and tap comfortably. */
export function AuthField({
  id,
  label,
  icon: Icon,
  aside,
  ...input
}: { id: string; label: string; icon: LucideIcon; aside?: ReactNode } & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-medium 2xl:text-base">{label}</Label>
        {aside}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input id={id} name={id} className="h-12 pl-11 text-base md:text-base 2xl:h-14 2xl:text-lg" {...input} />
      </div>
    </div>
  )
}

/** Heading of a sign-in page. */
export function AuthHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-navy 2xl:text-4xl">{title}</h1>
      <p className="mt-2 text-pretty text-base text-muted-foreground 2xl:text-lg">{children}</p>
    </div>
  )
}

/** A problem with the form, read out to screen readers. */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {children}
    </div>
  )
}
