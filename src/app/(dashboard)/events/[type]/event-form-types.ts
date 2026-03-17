import type {
  EventCategory,
  DeliveryMode,
  EventVisibility,
  SchedulingMode,
  EventTypeWithCategory,
} from '@/lib/supabase/queries/event-reference-queries'

export type EventFormReferenceData = {
  categories: EventCategory[]
  eventTypes: EventTypeWithCategory[]
  deliveryModes: DeliveryMode[]
  visibilities: EventVisibility[]
  schedulingModes: SchedulingMode[]
  schools: { id: string; name: string }[]
  profiles: { id: string; first_name: string | null; surname: string | null }[]
  parentEvents: { id: string; name: string }[]
}

export type EventData = {
  id: string
  event_type_id: number
  category_id: number | null
  parent_event_id: string | null
  delivery_mode_id: number | null
  visibility_id: number | null
  scheduling_mode_id: number | null
  school_id: string | null
  name: string
  location: string | null
  online_link: string | null
  capacity: number | null
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  remarks: string | null
  assigned_to: string | null
}

/** Shared input + select styles for the event form */
export const inputStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
export const selectTriggerStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
