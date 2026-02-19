import { z } from 'zod'

export const schoolSchema = z.object({
  name: z
    .string()
    .min(1, 'School name is required')
    .max(200, 'School name is too long'),
  type: z.string().min(1, 'School type is required'),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  website: z
    .string()
    .url('Invalid URL')
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z.string().max(5000).optional().nullable(),
  status: z.string().optional().nullable(),
})

export type SchoolFormData = z.infer<typeof schoolSchema>

export const schoolUpdateSchema = schoolSchema.partial()

export type SchoolUpdateFormData = z.infer<typeof schoolUpdateSchema>
