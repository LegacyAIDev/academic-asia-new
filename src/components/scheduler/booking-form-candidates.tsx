'use client'

import { useEffect, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getStudentApplicationsAction } from '@/lib/supabase/actions/scheduler-people'
import type { SchedulerStudentApplication, SchedulerStudentOption } from '@/lib/supabase/queries/scheduler-people'
import type { BookingFormInput } from '@/lib/scheduler/booking-schema'
import { BookingStudentSearch } from './booking-student-search'
import type { BookingForm } from './booking-dialog'

type AttendeeRow = NonNullable<BookingFormInput['attendees']>[number]

/** One row per candidate: student, application, optional seat number. `seats_required` follows the row count. */
export function BookingFormCandidates({ form, peopleLabels }: { form: BookingForm; peopleLabels: Record<string, string> }) {
  const attendees = useWatch({ control: form.control, name: 'attendees' }) ?? []
  const [names, setNames] = useState<Record<string, string>>(peopleLabels)
  const [applicationsByStudent, setApplicationsByStudent] = useState<Record<string, SchedulerStudentApplication[]>>({})

  const candidateRows = attendees
    .map((attendee, index) => ({ attendee, index }))
    .filter(row => row.attendee.role === 'candidate')

  useEffect(() => {
    for (const { attendee } of candidateRows) {
      if (attendee.student_id && !applicationsByStudent[attendee.student_id]) {
        getStudentApplicationsAction(attendee.student_id).then(result => {
          if (result.success) {
            setApplicationsByStudent(prev => ({ ...prev, [attendee.student_id!]: result.data ?? [] }))
          }
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form and the applications cache are stable refs; re-running on them would loop
  }, [attendees])

  useEffect(() => {
    const seatsRequired = form.getValues('seats_required') ?? 1
    if (candidateRows.length > seatsRequired) {
      form.setValue('seats_required', candidateRows.length, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form and the applications cache are stable refs; re-running on them would loop
  }, [candidateRows.length])

  const addCandidate = (student: SchedulerStudentOption) => {
    if (attendees.some(a => a.student_id === student.id)) return
    setNames(prev => ({ ...prev, [student.id]: `${student.first_name} ${student.surname}` }))
    const next: AttendeeRow[] = [...attendees, { profile_id: null, student_id: student.id, role: 'candidate', seat_no: null, application_id: null }]
    form.setValue('attendees', next, { shouldValidate: true })
  }

  const removeAt = (index: number) => {
    form.setValue('attendees', attendees.filter((_, i) => i !== index), { shouldValidate: true })
  }

  const updateRow = (index: number, patch: Partial<AttendeeRow>) => {
    const next = attendees.map((a, i) => (i === index ? { ...a, ...patch } : a))
    form.setValue('attendees', next, { shouldValidate: true })
  }

  return (
    <div className="space-y-2">
      <BookingStudentSearch onSelect={addCandidate} placeholder="Add candidate..." />

      {candidateRows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Application</TableHead>
              <TableHead className="w-24">Seat no.</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidateRows.map(({ attendee, index }) => {
              const applications = attendee.student_id ? applicationsByStudent[attendee.student_id] ?? [] : []
              return (
                <TableRow key={index}>
                  <TableCell>{names[attendee.student_id ?? ''] ?? 'Student'}</TableCell>
                  <TableCell>
                    <Select
                      value={attendee.application_id ?? undefined}
                      onValueChange={v => updateRow(index, { application_id: v })}
                    >
                      <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {applications.map(app => (
                          <SelectItem key={app.id} value={app.id}>{app.school?.name ?? 'Application'} ({app.entry_year ?? '—'})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="h-8"
                      value={attendee.seat_no ?? ''}
                      onChange={e => updateRow(index, { seat_no: e.target.value ? Number(e.target.value) : null })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAt(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {form.formState.errors.attendees && (
        <p className="text-sm text-destructive">{form.formState.errors.attendees.message as string}</p>
      )}
    </div>
  )
}
