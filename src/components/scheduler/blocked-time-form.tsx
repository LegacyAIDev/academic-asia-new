'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch, type Path, type PathValue } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  PRESET_LABELS,
  WEEKDAY_SHORT,
  blockedTimeSchema,
  toBlockedTimeInput,
  type BlockPreset,
  type BlockedTime,
  type BlockedTimeInput,
  type BlockedTimeValues,
} from '@/lib/scheduler/blocked-times'
import { TIMEZONE_LABEL } from '@/lib/scheduler/config'
import { todayInBusinessTz } from '@/lib/scheduler/search-params'
import { buildTimeOptions } from '@/lib/scheduler/time-utils'
import {
  createBlockedTime,
  updateBlockedTime,
  type BlockedTimeSubject,
  type SavedBlockedTime,
} from '@/lib/supabase/actions/scheduler-blocked-times'
import { BlockedTimeDateField } from './blocked-time-date-field'

const TIME_OPTIONS = buildTimeOptions('00:00', '23:45', 15)
const PRESETS: BlockPreset[] = ['weekdays', 'every_day', 'pick', 'once']
const FIELD_LABEL = 'text-xs font-medium text-muted-foreground'

type Props = {
  subject: BlockedTimeSubject
  /** The block being edited; omit to add a new one. */
  block?: BlockedTime
  onSaved: (saved: SavedBlockedTime) => void
  onCancel: () => void
}

function defaultValues(block?: BlockedTime): BlockedTimeInput {
  if (block) return toBlockedTimeInput(block)
  return { label: '', preset: 'weekdays', weekdays: [], start_time: '13:00', end_time: '14:00', starts_on: todayInBusinessTz(), ends_on: null }
}

/** Add or edit one recurring block: name, how it repeats, the hours and the dates it runs between. */
export function BlockedTimeForm({ subject, block, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false)
  const form = useForm<BlockedTimeInput, unknown, BlockedTimeValues>({
    resolver: zodResolver(blockedTimeSchema),
    defaultValues: defaultValues(block),
  })
  const { errors } = form.formState
  const [preset, weekdays, startTime, endTime, startsOn, endsOn] = useWatch({
    control: form.control,
    name: ['preset', 'weekdays', 'start_time', 'end_time', 'starts_on', 'ends_on'],
  })
  const set = <K extends Path<BlockedTimeInput>>(name: K, value: PathValue<BlockedTimeInput, K>) =>
    form.setValue(name, value, { shouldValidate: form.formState.isSubmitted, shouldDirty: true })

  const save = async () => {
    setSaving(true)
    const raw = form.getValues()
    const result = block ? await updateBlockedTime(block.id, subject, raw) : await createBlockedTime(subject, raw)
    setSaving(false)
    if (!result.success || !result.data) return toast.error(result.error ?? 'Could not save the blocked time')
    toast.success(block ? 'Blocked time updated' : 'Time blocked')
    onSaved(result.data)
  }

  return (
    <form onSubmit={form.handleSubmit(save)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="block-label" className={FIELD_LABEL}>Name</Label>
        <Input id="block-label" placeholder="Lunch" maxLength={80} {...form.register('label')} />
        {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={FIELD_LABEL}>Repeats</Label>
        <ToggleGroup type="single" variant="outline" value={preset} onValueChange={v => v && set('preset', v as BlockPreset)} className="flex-wrap">
          {PRESETS.map(key => (
            <ToggleGroupItem key={key} value={key} className="h-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {PRESET_LABELS[key]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {preset === 'pick' && (
          <ToggleGroup
            type="multiple"
            variant="outline"
            aria-label="Days"
            value={(weekdays ?? []).map(String)}
            onValueChange={days => set('weekdays', days.map(Number))}
            className="flex-wrap"
          >
            {WEEKDAY_SHORT.map((name, index) => (
              <ToggleGroupItem key={name} value={String(index + 1)} aria-label={name} className="h-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {errors.weekdays && <p className="text-sm text-destructive">{errors.weekdays.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TimeSelect label={`From (${TIMEZONE_LABEL})`} value={startTime} onChange={v => set('start_time', v)} />
        <TimeSelect label={`To (${TIMEZONE_LABEL})`} value={endTime} onChange={v => set('end_time', v)} />
      </div>
      {errors.end_time && <p className="-mt-2 text-sm text-destructive">{errors.end_time.message}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL}>{preset === 'once' ? 'Date' : 'From date'}</Label>
          <BlockedTimeDateField value={startsOn} onChange={v => set('starts_on', v)} ariaLabel="Start date" />
        </div>
        {preset !== 'once' && (
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL}>Until</Label>
            <BlockedTimeDateField
              value={endsOn ?? startsOn}
              onChange={v => set('ends_on', v)}
              disabled={endsOn === null}
              ariaLabel="End date"
            />
          </div>
        )}
      </div>
      {preset !== 'once' && (
        <div className="flex min-h-9 items-center gap-2">
          <Checkbox id="block-no-end" checked={endsOn === null} onCheckedChange={checked => set('ends_on', checked ? null : startsOn)} />
          <Label htmlFor="block-no-end" className="cursor-pointer">No end date</Label>
        </div>
      )}
      {errors.ends_on && <p className="text-sm text-destructive">{errors.ends_on.message}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" className="h-9" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" className="h-9" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {block ? 'Save changes' : 'Block time'}
        </Button>
      </div>
    </form>
  )
}

function TimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className={FIELD_LABEL}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full tabular-nums" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-64">
          {TIME_OPTIONS.map(time => <SelectItem key={time} value={time} className="tabular-nums">{time}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
