import { CalendarCheck, ClipboardCheck, FileSignature, History, MapPin, Sparkles, Wallet } from "lucide-react"
import { formatDate } from "@/lib/applications/application-display"
import type { TimelineEntry, TimelineKind } from "@/lib/applications/application-timeline"
import { Section } from "./application-section"

const KIND_ICONS: Record<TimelineKind, React.ElementType> = {
  registration: FileSignature,
  event: Sparkles,
  visit: MapPin,
  exam: ClipboardCheck,
  booking: CalendarCheck,
  deposit: Wallet,
}

/** Dated history of the application, newest first. */
export function ApplicationTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <Section icon={History} title="Timeline" count={entries.length} plain>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No dated events recorded for this application.</p>
      ) : (
        <ol className="relative space-y-4 border-l pl-5">
          {entries.map((entry, index) => {
            const Icon = KIND_ICONS[entry.kind]
            return (
              <li key={`${entry.kind}-${entry.date}-${index}`} className="relative">
                <span className="absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                  <Icon className="h-3 w-3 text-primary" />
                </span>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatDate(entry.date)}{entry.time ? ` · ${entry.time}` : ""}
                </p>
                <p className="text-sm font-medium">{entry.title}</p>
                {entry.detail && <p className="text-xs text-muted-foreground">{entry.detail}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}
