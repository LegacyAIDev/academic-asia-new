'use client'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, MapPin } from 'lucide-react'
import type { SchedulerRepresentative, SchedulerSchedule } from '@/lib/supabase/queries/event-scheduler'

type RepresentativeTabsProps = {
  representatives: SchedulerRepresentative[]
  selectedRepId: string
  onSelect: (repId: string) => void
  schedules: SchedulerSchedule[]
}

/** Tab bar for switching between representatives */
export function RepresentativeTabs({
  representatives, selectedRepId, onSelect, schedules,
}: RepresentativeTabsProps) {
  const countByRep: Record<string, number> = {}
  schedules.forEach(s => {
    if (s.representative_id) {
      countByRep[s.representative_id] = (countByRep[s.representative_id] ?? 0) + 1
    }
  })

  return (
    <Tabs value={selectedRepId} onValueChange={onSelect}>
      <TabsList className="h-auto flex-wrap gap-1.5 bg-muted/50 p-1.5">
        {representatives.map(rep => {
          const count = countByRep[rep.id] ?? 0
          return (
            <TabsTrigger
              key={rep.id}
              value={rep.id}
              className="gap-2 px-4 py-2.5 transition-all data-[state=active]:shadow-sm"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/60 data-[state=active]:bg-primary/10">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium">{rep.name}</span>
              {rep.school?.name && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  ({rep.school.name})
                </span>
              )}
              {rep.venue_room && (
                <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
                  <MapPin className="h-3 w-3" />
                  {rep.venue_room}
                </span>
              )}
              <Badge
                variant="secondary"
                className="ml-0.5 h-5 min-w-[22px] px-1.5 text-[11px] font-medium tabular-nums"
              >
                {count}
              </Badge>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
