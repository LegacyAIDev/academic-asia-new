'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BOOKING_TYPES, BOOKING_TYPE_LABELS, type BookingType } from '@/lib/scheduler/config'
import { colorForType } from '@/lib/scheduler/colors'
import { STATUS_FILTERS, type SchedulerParams, type StatusFilter } from '@/lib/scheduler/search-params'
import type { SchedulerRoom } from '@/lib/supabase/queries/scheduler-rooms'
import type { SchedulerStaffOption } from '@/lib/supabase/queries/scheduler-people'

type Props = {
  params: SchedulerParams
  rooms: SchedulerRoom[]
  staff: SchedulerStaffOption[]
  onChange: (patch: Partial<SchedulerParams>) => void
}

const ALL = '__all__'
const CHIP = 'h-9 w-auto min-w-[120px] rounded-full border-border bg-card text-xs font-medium shadow-none data-[state=open]:border-primary'

/** Type, room and status filters as a quiet chip row; each choice is written straight to the URL. */
export function SchedulerFilterBar({ params, rooms, staff, onChange }: Props) {
  const activeCount = params.types.length + params.roomIds.length + (params.status ? 1 : 0)
  const staffName = (id: string) => {
    const s = staff.find(p => p.id === id)
    return s ? `${s.first_name ?? ''} ${s.surname ?? ''}`.trim() : id
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Filters
        {activeCount > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground tabular-nums">{activeCount}</span>}
      </span>

      <Select value={params.types[0] ?? ALL} onValueChange={v => onChange({ types: v === ALL ? [] : [v as BookingType] })}>
        <SelectTrigger className={CHIP} aria-label="Booking type"><SelectValue placeholder="All types" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {BOOKING_TYPES.map(t => (
            <SelectItem key={t} value={t}>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: colorForType(t) }} aria-hidden />
              {BOOKING_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.roomIds[0] ?? ALL} onValueChange={v => onChange({ roomIds: v === ALL ? [] : [v] })}>
        <SelectTrigger className={CHIP} aria-label="Room"><SelectValue placeholder="All rooms" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All rooms</SelectItem>
          {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={params.status ?? ALL} onValueChange={v => onChange({ status: v === ALL ? null : (v as StatusFilter) })}>
        <SelectTrigger className={CHIP} aria-label="Status"><SelectValue placeholder="Any status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any status</SelectItem>
          {STATUS_FILTERS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
        </SelectContent>
      </Select>

      {params.view === 'team' && params.profileIds.map(id => (
        <Badge key={id} variant="secondary" className="h-7 rounded-full px-2.5">{staffName(id)}</Badge>
      ))}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-9 rounded-full" onClick={() => onChange({ types: [], roomIds: [], status: null })}>
          <X className="mr-1 h-3 w-3" /> Clear
        </Button>
      )}
    </div>
  )
}
