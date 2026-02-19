'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { studentSchema, type StudentFormData } from '@/lib/validations/student'
import { useCreateStudent, useUpdateStudent } from '@/hooks/use-students'
import type { Student } from '@/services/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateStudentCode } from '@/lib/utils'

interface StudentFormProps {
  student?: Student
  mode?: 'create' | 'edit'
}

export function StudentForm({ student, mode = 'create' }: StudentFormProps) {
  const router = useRouter()
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? {
          first_name: student.first_name,
          surname: student.surname,
          chinese_name: student.chinese_name,
          gender: student.gender as 'M' | 'F' | 'Other' | undefined,
          date_of_birth: student.date_of_birth,
          nationality: student.nationality,
          passport_number: student.passport_number,
          email: student.email,
          phone: student.phone,
          address: student.address,
          present_school: student.present_school,
          entry_year: student.entry_year,
          notes: student.notes,
        }
      : {},
  })

  async function onSubmit(data: StudentFormData) {
    try {
      if (mode === 'edit' && student) {
        await updateStudent.mutateAsync({ id: student.id, data })
      } else {
        await createStudent.mutateAsync({
          ...data,
          student_code: generateStudentCode(),
        })
      }
      router.push('/students')
      router.refresh()
    } catch (error) {
      console.error('Failed to save student:', error)
    }
  }

  const isPending = createStudent.isPending || updateStudent.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            {...register('first_name')}
            className="mt-1"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.first_name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="surname">Surname *</Label>
          <Input id="surname" {...register('surname')} className="mt-1" />
          {errors.surname && (
            <p className="mt-1 text-sm text-red-600">
              {errors.surname.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="chinese_name">Chinese Name</Label>
          <Input
            id="chinese_name"
            {...register('chinese_name')}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            {...register('gender')}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input
            id="date_of_birth"
            type="date"
            {...register('date_of_birth')}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            {...register('nationality')}
            className="mt-1"
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            className="mt-1"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register('phone')} className="mt-1" />
        </div>
      </div>

      {/* School Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="present_school">Present School</Label>
          <Input
            id="present_school"
            {...register('present_school')}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="entry_year">Entry Year</Label>
          <Input
            id="entry_year"
            {...register('entry_year')}
            placeholder="e.g., 2025-SEP"
            className="mt-1"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={4}
          className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isPending || isSubmitting}>
          {isPending ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}{' '}
          Student
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
