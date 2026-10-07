import { z } from 'zod'

/**
 * Shared validation for the rooms admin page — the room/location dialogs
 * validate with these before calling the scheduler-rooms/scheduler-locations
 * server actions, which trust the shape once it passes here.
 */

const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex colour like #2563eb')

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional()

export const roomFormSchema = z.object({
  display_name: z.string().trim().min(1, 'Room name is required').max(100),
  location_id: z.string().uuid('Select a location'),
  floor: optionalText(50),
  room_number: optionalText(50),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  is_exam_suitable: z.boolean().default(false),
  online_station_count: z.coerce.number().int().min(0).default(0),
  is_accessible: z.boolean().default(false),
  facilities_notes: optionalText(1000),
  color: hexColor.nullable().optional(),
  is_active: z.boolean().default(true),
})

export type RoomFormValues = z.infer<typeof roomFormSchema>

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, 'Location name is required').max(100),
  address: optionalText(300),
  building: optionalText(100),
  is_active: z.boolean().default(true),
})

export type LocationFormValues = z.infer<typeof locationFormSchema>
