import { z } from 'zod'

export const studentSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  surname: z
    .string()
    .min(1, 'Surname is required')
    .max(100, 'Surname is too long'),
  chinese_name: z.string().max(100).optional().nullable(),
  gender: z.enum(['M', 'F', 'Other']).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  passport_number: z.string().max(50).optional().nullable(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  present_school: z.string().max(200).optional().nullable(),
  entry_year: z.string().max(20).optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

export type StudentFormData = z.infer<typeof studentSchema>

// For updates, all fields are optional
export const studentUpdateSchema = studentSchema.partial()

export type StudentUpdateFormData = z.infer<typeof studentUpdateSchema>
