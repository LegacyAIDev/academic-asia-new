// Application-facing type aliases over the generated Supabase schema.
//
// The generated types live in `./database` and are rewritten wholesale by
// `npm run db:types` — never hand-edit that file. Everything below is
// hand-maintained and safe to extend.

import type { Database } from './database'

export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from './database'
export { Constants } from './database'

// Convenience type aliases
export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']

export type StudentContact = Database['public']['Tables']['student_contacts']['Row']
export type StudentContactInsert = Database['public']['Tables']['student_contacts']['Insert']

export type School = Database['public']['Tables']['schools']['Row']
export type SchoolInsert = Database['public']['Tables']['schools']['Insert']

export type StudentStatus = Database['public']['Tables']['student_statuses']['Row']
export type PlacementStatus = Database['public']['Tables']['placement_statuses']['Row']
export type Nationality = Database['public']['Tables']['nationalities']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type LeadSource = Database['public']['Tables']['lead_sources']['Row']
export type SchoolType = Database['public']['Tables']['school_types']['Row']
export type ContactRelationship = Database['public']['Tables']['contact_relationships']['Row']
export type ContactTitle = Database['public']['Tables']['contact_titles']['Row']
export type Country = Database['public']['Tables']['countries']['Row']

export type ApplicationStatus = Database['public']['Tables']['application_statuses']['Row']
export type ApplicationSubStatus = Database['public']['Tables']['application_sub_statuses']['Row']
export type ApplicationMode = Database['public']['Tables']['application_modes']['Row']
export type StudentApplication = Database['public']['Tables']['student_applications']['Row']
export type StudentApplicationInsert = Database['public']['Tables']['student_applications']['Insert']
export type StudentApplicationUpdate = Database['public']['Tables']['student_applications']['Update']
export type StudentApplicationDeposit = Database['public']['Tables']['student_application_deposits']['Row']

// Extended types with joined reference data
export type StudentWithRelations = Student & {
  status?: StudentStatus | null
  placement?: PlacementStatus | null
  nationality?: Nationality | null
  course?: Course | null
  lead_source?: LeadSource | null
  school_type?: SchoolType | null
}

export type StudentContactWithRelations = StudentContact & {
  relationship?: ContactRelationship | null
  title?: ContactTitle | null
}

export type StudentApplicationWithRelations = StudentApplication & {
  school?: { id: string; name: string } | null
  course?: { id: number; code: string; label: string } | null
  status?: { id: number; code: string; label: string; category: string | null } | null
  sub_status?: { id: number; code: string; label: string } | null
  mode?: { id: number; code: string; label: string } | null
  event?: { id: string; name: string } | null
}

export type EducationCourse = Database['public']['Tables']['education_courses']['Row']
export type EducationStatus = Database['public']['Tables']['education_statuses']['Row']
export type StudentEducation = Database['public']['Tables']['student_education']['Row']
export type StudentEducationInsert = Database['public']['Tables']['student_education']['Insert']
export type StudentEducationUpdate = Database['public']['Tables']['student_education']['Update']

export type StudentEducationWithRelations = StudentEducation & {
  course?: { id: number; code: string; label: string; category: string | null } | null
  status?: { id: number; code: string; label: string } | null
}

export type VisaStatus = Database['public']['Tables']['visa_statuses']['Row']
export type StudentVisa = Database['public']['Tables']['student_visas']['Row']
export type StudentVisaInsert = Database['public']['Tables']['student_visas']['Insert']
export type StudentVisaUpdate = Database['public']['Tables']['student_visas']['Update']

export type StudentVisaWithRelations = StudentVisa & {
  school?: { id: string; name: string } | null
  status?: { id: number; code: string; label: string } | null
}

export type EventType = Database['public']['Tables']['event_types']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type EventApplicationStatus = Database['public']['Tables']['event_application_statuses']['Row']
export type StudentEventApplication = Database['public']['Tables']['student_event_applications']['Row']
export type StudentEventApplicationInsert = Database['public']['Tables']['student_event_applications']['Insert']
export type StudentEventApplicationUpdate = Database['public']['Tables']['student_event_applications']['Update']

export type StudentEventApplicationWithRelations = StudentEventApplication & {
  event?: { id: string; name: string; event_type_id: number; event_types?: { id: number; code: string; label: string; color: string | null } | null } | null
  status?: { id: number; code: string; label: string } | null
}

export type Airline = Database['public']['Tables']['airlines']['Row']
export type Airport = Database['public']['Tables']['airports']['Row']
export type TravelStatus = Database['public']['Tables']['travel_statuses']['Row']
export type PickupStatus = Database['public']['Tables']['pickup_statuses']['Row']
export type PickupProvider = Database['public']['Tables']['pickup_providers']['Row']
export type StudentTravel = Database['public']['Tables']['student_travel']['Row']
export type StudentTravelInsert = Database['public']['Tables']['student_travel']['Insert']
export type StudentTravelUpdate = Database['public']['Tables']['student_travel']['Update']

export type StudentTravelWithRelations = StudentTravel & {
  airline?: { id: number; code: string; label: string } | null
  airport?: { id: number; code: string; label: string; city: string | null } | null
  status?: { id: number; code: string; label: string } | null
  pickup_status_ref?: { id: number; code: string; label: string } | null
  pickup_provider?: { id: number; code: string; label: string } | null
}

export type ExamType = Database['public']['Tables']['exam_types']['Row']
export type ExamSubject = Database['public']['Tables']['exam_subjects']['Row']
export type ExamPaper = Database['public']['Tables']['exam_papers']['Row']
export type ExamResultStatus = Database['public']['Tables']['exam_result_statuses']['Row']
export type StudentExamResult = Database['public']['Tables']['student_exam_results']['Row']
export type StudentExamResultInsert = Database['public']['Tables']['student_exam_results']['Insert']
export type StudentExamResultUpdate = Database['public']['Tables']['student_exam_results']['Update']

export type StudentExamResultWithRelations = StudentExamResult & {
  school?: { id: string; name: string } | null
  exam_type?: { id: number; code: string; label: string } | null
  subject?: { id: number; code: string; label: string; exam_type_code: string | null } | null
  paper?: { id: number; code: string; label: string } | null
  status?: { id: number; code: string; label: string } | null
}
