import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = { success: boolean; data?: T; error?: string }

/** Maps a Postgres error from a rooms/locations write to a friendly action result. */
export function toActionResult<T>(error: { code?: string; message: string }): ActionResult<T> {
  if (error.code === '23505') return { success: false, error: 'A room or location with this name already exists.' }
  return { success: false, error: error.message }
}

/** Rooms and locations affect both the admin page and the calendar. */
export function revalidateSchedulerPaths() {
  revalidatePath('/scheduler/rooms')
  revalidatePath('/scheduler')
}
