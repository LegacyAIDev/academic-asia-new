import { addEventSchool } from "@/lib/supabase/actions/events"
import { addRepresentative } from "@/lib/supabase/actions/event-representatives"
import { addExamBlock } from "@/lib/supabase/actions/event-exam-blocks"
import type { RepresentativeRow } from "./event-form-representatives"
import type { ExamBlockRow } from "./event-form-exam-blocks"

type SaveSubItemsParams = {
  eventId: string
  isEngagement: boolean
  showRepresentatives: boolean
  showExamBlocks: boolean
  selectedSchoolIds: string[]
  representatives: RepresentativeRow[]
  examBlocks: ExamBlockRow[]
}

/** Batch-insert sub-items (schools, representatives, exam blocks) after event creation */
export async function saveEventSubItems(p: SaveSubItemsParams) {
  if (p.isEngagement && p.selectedSchoolIds.length > 0) {
    await Promise.all(p.selectedSchoolIds.map((schoolId) =>
      addEventSchool({ event_id: p.eventId, school_id: schoolId })
    ))
  }

  if (p.showRepresentatives && p.representatives.length > 0) {
    await Promise.all(p.representatives.filter((r) => r.name).map((r) =>
      addRepresentative({
        event_id: p.eventId, name: r.name, role: r.role || null,
        venue_room: r.venue_room || null, available_from: r.available_from || null,
        available_to: r.available_to || null,
        slot_length_minutes: r.slot_length_minutes ? parseInt(r.slot_length_minutes, 10) : null,
        remarks: r.remarks || null,
      })
    ))
  }

  if (p.showExamBlocks && p.examBlocks.length > 0) {
    await Promise.all(p.examBlocks.filter((b) => b.subject || b.name).map((b, idx) =>
      addExamBlock({
        event_id: p.eventId, subject: b.subject || null, name: b.name || null,
        apply_year: b.apply_year || null,
        duration_minutes: b.duration_minutes ? parseInt(b.duration_minutes, 10) : null,
        start_time: b.start_time || null, end_time: b.end_time || null,
        venue_room: b.venue_room || null, invigilator_names: b.invigilator_names || null,
        capacity: b.capacity ? parseInt(b.capacity, 10) : null,
        allowed_items: b.allowed_items || null, special_instructions: b.special_instructions || null,
        sort_order: idx,
      })
    ))
  }
}
