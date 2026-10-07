'use client'

import { TZDate } from '@date-fns/tz'
import { addDays, addMonths, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { SCHEDULER_TIMEZONE, TIMEZONE_LABEL } from '@/lib/scheduler/config'
import { todayInBusinessTz, type SchedulerMode, type SchedulerParams, type SchedulerView } from '@/lib/scheduler/search-params'
import type { SchedulerStaffOption } from '@/lib/supabase/queries/scheduler-people'
import { PeoplePicker } from './people-picker'

type Props = {
  params: SchedulerParams
  staff: SchedulerStaffOption[]
  pending: boolean
  canWrite: boolean
  onChange: (patch: Partial<SchedulerParams>) => void
  onNewBooking: () => void
}

function shiftDate(date: string, mode: SchedulerMode, direction: 1 | -1): string {
  const [y, m, d] = date.split('-').map(Number)
  const anchor = new TZDate(y, m - 1, d, SCHEDULER_TIMEZONE)
  const next = mode === 'month' ? addMonths(anchor, direction) : addDays(anchor, direction * (mode === 'week' ? 7 : 1))
  return format(next, 'yyyy-MM-dd')
}

function dateLabel(date: string, mode: SchedulerMode): string {
  const [y, m, d] = date.split('-').map(Number)
  const anchor = new TZDate(y, m - 1, d, SCHEDULER_TIMEZONE)
  if (mode === 'month') return format(anchor, 'MMMM yyyy')
  if (mode === 'day') return format(anchor, 'EEEE dd/MM/yyyy')
  return `Week of ${format(anchor, 'dd/MM/yyyy')}`
}

/** Command bar: view tabs, date navigation with the mode switch, people picker and the primary action. */
export function SchedulerToolbar({ params, staff, pending, canWrite, onChange, onNewBooking }: Props) {
  const modes: SchedulerMode[] = params.view === 'rooms' ? ['day', 'week'] : ['day', 'week', 'month']

  return (
    <div className="rounded-xl border border-border bg-card p-2 shadow-sm sm:p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={params.view} onValueChange={v => onChange({ view: v as SchedulerView, mode: v === 'rooms' && params.mode === 'month' ? 'day' : params.mode })}>
          <TabsList className="h-9">
            <TabsTrigger value="my">My calendar</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2 lg:mx-auto">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Previous" onClick={() => onChange({ date: shiftDate(params.date, params.mode, -1) })}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-9" onClick={() => onChange({ date: todayInBusinessTz() })}>Today</Button>
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Next" onClick={() => onChange({ date: shiftDate(params.date, params.mode, 1) })}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className={cn('min-w-[150px] px-1 leading-tight', pending && 'opacity-60')} aria-live="polite">
            <p className="text-sm font-semibold tabular-nums">{dateLabel(params.date, params.mode)}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{TIMEZONE_LABEL}</p>
          </div>

          <ToggleGroup type="single" value={params.mode} onValueChange={v => v && onChange({ mode: v as SchedulerMode })} variant="outline" className="h-9">
            {modes.map(mode => (
              <ToggleGroupItem key={mode} value={mode} className="h-9 px-3 capitalize data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {mode}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex items-center gap-2 lg:ml-auto">
          {params.view === 'team' && (
            <PeoplePicker
              staff={staff}
              profileIds={params.profileIds}
              studentIds={params.studentIds}
              onChange={(profileIds, studentIds) => onChange({ profileIds, studentIds })}
            />
          )}
          {canWrite && (
            <Button className="h-9" onClick={onNewBooking}>
              <Plus className="mr-1 h-4 w-4" /> New booking
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
