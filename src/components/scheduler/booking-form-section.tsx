import { cn } from '@/lib/utils'

/** Uppercase eyebrow shared by every scheduler section label (When · Where · Who · Details). */
export function SectionEyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-wide text-muted-foreground', className)}>{children}</p>
  )
}

/** One titled block of the booking form; the eyebrow sits on the hairline so sections scan as a list. */
export function BookingFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <SectionEyebrow>{title}</SectionEyebrow>
      {children}
    </section>
  )
}
