'use client'

import { useEffect, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getStudentApplicationsAction } from '@/lib/supabase/actions/scheduler-people'
import type { SchedulerStudentApplication } from '@/lib/supabase/queries/scheduler-people'
import { BookingFormStaffAttendees } from './booking-form-staff-attendees'
import { BookingFormCandidates } from './booking-form-candidates'
import { BookingStudentSearch } from './booking-student-search'
import type { BookingForm, StaffOption } from './booking-dialog'

const SINGLE_STUDENT_TYPES = new Set(['examination', 'consultation', 'school_interview'])

/** Organiser, staff attendees, the single student/application pair or the candidates table, and seats. */
export function BookingFormPeople({
  form,
  staff,
  peopleLabels,
}: {
  form: BookingForm
  staff: StaffOption[]
  peopleLabels: Record<string, string>
}) {
  const bookingType = useWatch({ control: form.control, name: 'booking_type' })
  const organiserId = useWatch({ control: form.control, name: 'organiser_id' })
  const studentId = useWatch({ control: form.control, name: 'student_id' })
  const applicationId = useWatch({ control: form.control, name: 'application_id' })
  const seatsRequired = useWatch({ control: form.control, name: 'seats_required' }) ?? 1
  const locationType = useWatch({ control: form.control, name: 'location_type' })

  const [studentName, setStudentName] = useState<string | null>(studentId ? peopleLabels[studentId] : null)
  const [applications, setApplications] = useState<SchedulerStudentApplication[]>([])

  useEffect(() => {
    if (!studentId) return
    getStudentApplicationsAction(studentId).then(result => {
      if (result.success) setApplications(result.data ?? [])
    })
  }, [studentId])

  const showSingleStudent = SINGLE_STUDENT_TYPES.has(bookingType)
  const showCandidates = bookingType === 'group_examination'

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Organiser</Label>
        <Select value={organiserId ?? undefined} onValueChange={v => form.setValue('organiser_id', v, { shouldValidate: true })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select organiser" /></SelectTrigger>
          <SelectContent>
            {staff.map(person => (
              <SelectItem key={person.id} value={person.id}>{[person.first_name, person.surname].filter(Boolean).join(' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Staff attendees</Label>
        <BookingFormStaffAttendees form={form} staff={staff} />
      </div>

      {showSingleStudent && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Student</Label>
            {studentId && studentName ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{studentName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.setValue('student_id', null, { shouldValidate: true })
                    form.setValue('application_id', null)
                    setStudentName(null)
                    setApplications([])
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <BookingStudentSearch
                onSelect={student => {
                  form.setValue('student_id', student.id, { shouldValidate: true })
                  form.setValue('application_id', null)
                  setStudentName(`${student.first_name} ${student.surname}`)
                }}
              />
            )}
            {form.formState.errors.student_id && (
              <p className="text-sm text-destructive">{form.formState.errors.student_id.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Application</Label>
            <Select
              value={applicationId ?? undefined}
              onValueChange={v => form.setValue('application_id', v, { shouldValidate: true })}
              disabled={!studentId}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select application" /></SelectTrigger>
              <SelectContent>
                {applications.map(app => (
                  <SelectItem key={app.id} value={app.id}>{app.school?.name ?? 'Application'} ({app.entry_year ?? '—'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {showCandidates && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Candidates</Label>
          <BookingFormCandidates form={form} peopleLabels={peopleLabels} />
        </div>
      )}

      {locationType === 'room' && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Seats required</Label>
          <div className="flex w-32 items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => form.setValue('seats_required', Math.max(1, seatsRequired - 1), { shouldValidate: true })}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-8 text-center text-sm">{seatsRequired}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => form.setValue('seats_required', seatsRequired + 1, { shouldValidate: true })}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
