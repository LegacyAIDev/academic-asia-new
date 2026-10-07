'use client'

import { useState } from 'react'
import { useWatch } from 'react-hook-form'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ATTENDEE_ROLES, type AttendeeRole } from '@/lib/scheduler/config'
import type { BookingFormInput } from '@/lib/scheduler/booking-schema'
import type { BookingForm, StaffOption } from './booking-dialog'

type AttendeeRow = NonNullable<BookingFormInput['attendees']>[number]

const STAFF_ROLES = ATTENDEE_ROLES.filter(r => r !== 'candidate') as AttendeeRole[]

function staffName(staff: StaffOption): string {
  return [staff.first_name, staff.surname].filter(Boolean).join(' ') || 'Unnamed'
}

/** Staff attendees with a role per row (officer/consultant/staff/attendee), added via search. */
export function BookingFormStaffAttendees({ form, staff }: { form: BookingForm; staff: StaffOption[] }) {
  const [open, setOpen] = useState(false)
  const attendees = useWatch({ control: form.control, name: 'attendees' }) ?? []

  const staffRows = attendees
    .map((attendee, index) => ({ attendee, index }))
    .filter(row => row.attendee.profile_id)

  const addStaff = (profileId: string) => {
    if (attendees.some(a => a.profile_id === profileId)) return
    const next: AttendeeRow[] = [...attendees, { profile_id: profileId, student_id: null, role: 'staff', seat_no: null, application_id: null }]
    form.setValue('attendees', next, { shouldValidate: true })
    setOpen(false)
  }

  const removeAt = (index: number) => {
    form.setValue('attendees', attendees.filter((_, i) => i !== index), { shouldValidate: true })
  }

  const updateRole = (index: number, role: AttendeeRole) => {
    const next = attendees.map((a, i) => (i === index ? { ...a, role } : a))
    form.setValue('attendees', next, { shouldValidate: true })
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            Add staff attendee
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search staff..." />
            <CommandList>
              <CommandEmpty>No staff found.</CommandEmpty>
              {staff.map(person => (
                <CommandItem key={person.id} value={staffName(person)} onSelect={() => addStaff(person.id)}>
                  <Check className={cn('mr-2 h-4 w-4', attendees.some(a => a.profile_id === person.id) ? 'opacity-100' : 'opacity-0')} />
                  {staffName(person)}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {staffRows.length > 0 && (
        <div className="space-y-1.5">
          {staffRows.map(({ attendee, index }) => {
            const person = staff.find(s => s.id === attendee.profile_id)
            return (
              <div key={index} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
                <span className="text-sm">{person ? staffName(person) : 'Unknown staff'}</span>
                <div className="flex items-center gap-2">
                  <Select value={attendee.role} onValueChange={v => updateRole(index, v as AttendeeRole)}>
                    <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map(role => <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAt(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
