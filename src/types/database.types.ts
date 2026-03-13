export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      airlines: {
        Row: {
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      airports: {
        Row: {
          city: string | null
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          city?: string | null
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          city?: string | null
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      application_modes: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      application_statuses: {
        Row: {
          category: string | null
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      application_sub_statuses: {
        Row: {
          category: string | null
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      contact_relationships: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      contact_titles: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      exam_papers: {
        Row: {
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      exam_result_statuses: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      exam_subjects: {
        Row: {
          code: string
          exam_type_code: string | null
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          exam_type_code?: string | null
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          exam_type_code?: string | null
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      exam_types: {
        Row: {
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      education_courses: {
        Row: {
          category: string | null
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      event_application_statuses: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      event_types: {
        Row: {
          code: string
          color: string | null
          description: string | null
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          color?: string | null
          description?: string | null
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          color?: string | null
          description?: string | null
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          duration_minutes: number | null
          end_date: string | null
          end_time: string | null
          event_type_id: number
          id: string
          legacy_id: number | null
          legacy_last_update: string | null
          legacy_table: string | null
          location: string | null
          name: string
          remarks: string | null
          start_date: string | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          end_time?: string | null
          event_type_id: number
          id?: string
          legacy_id?: number | null
          legacy_last_update?: string | null
          legacy_table?: string | null
          location?: string | null
          name: string
          remarks?: string | null
          start_date?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          end_time?: string | null
          event_type_id?: number
          id?: string
          legacy_id?: number | null
          legacy_last_update?: string | null
          legacy_table?: string | null
          location?: string | null
          name?: string
          remarks?: string | null
          start_date?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      education_statuses: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          category: string | null
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      nationalities: {
        Row: {
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      pickup_providers: {
        Row: {
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      pickup_statuses: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      placement_statuses: {
        Row: {
          code: string
          color: string | null
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          color?: string | null
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          color?: string | null
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      school_gender_types: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      school_institution_types: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      school_phases: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      school_religious_affiliations: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      school_types: {
        Row: {
          code: string
          id: number
          label: string
          region: string | null
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          region?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          region?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          accepts_applications: boolean | null
          accepts_child_visa: boolean | null
          accepts_general_visa: boolean | null
          address: string | null
          boarder_age_min: number | null
          boarder_age_max: number | null
          legacy_boarder_age_range: string | null
          boarder_count: number | null
          child_visa_age: number | null
          city: string | null
          country_id: number | null
          county: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          fax: string | null
          gender_type_id: number | null
          id: string
          institution_type_id: number | null
          keywords: string | null
          latitude: number | null
          legacy_id: number | null
          legacy_last_update: string | null
          login_name: string | null
          longitude: number | null
          name: string
          phase_id: number | null
          postcode: string | null
          pupil_count: number | null
          religious_affiliation_id: number | null
          remarks: string | null
          staff_id: string | null
          status: string | null
          telephone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accepts_applications?: boolean | null
          accepts_child_visa?: boolean | null
          accepts_general_visa?: boolean | null
          address?: string | null
          boarder_age_min?: number | null
          boarder_age_max?: number | null
          legacy_boarder_age_range?: string | null
          boarder_count?: number | null
          child_visa_age?: number | null
          city?: string | null
          country_id?: number | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          fax?: string | null
          gender_type_id?: number | null
          id?: string
          institution_type_id?: number | null
          keywords?: string | null
          latitude?: number | null
          legacy_id?: number | null
          legacy_last_update?: string | null
          login_name?: string | null
          longitude?: number | null
          name: string
          phase_id?: number | null
          postcode?: string | null
          pupil_count?: number | null
          religious_affiliation_id?: number | null
          remarks?: string | null
          staff_id?: string | null
          status?: string | null
          telephone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accepts_applications?: boolean | null
          accepts_child_visa?: boolean | null
          accepts_general_visa?: boolean | null
          address?: string | null
          boarder_age_min?: number | null
          boarder_age_max?: number | null
          legacy_boarder_age_range?: string | null
          boarder_count?: number | null
          child_visa_age?: number | null
          city?: string | null
          country_id?: number | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          fax?: string | null
          gender_type_id?: number | null
          id?: string
          institution_type_id?: number | null
          keywords?: string | null
          latitude?: number | null
          legacy_id?: number | null
          legacy_last_update?: string | null
          login_name?: string | null
          longitude?: number | null
          name?: string
          phase_id?: number | null
          postcode?: string | null
          pupil_count?: number | null
          religious_affiliation_id?: number | null
          remarks?: string | null
          staff_id?: string | null
          status?: string | null
          telephone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_gender_type_id_fkey"
            columns: ["gender_type_id"]
            isOneToOne: false
            referencedRelation: "school_gender_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_institution_type_id_fkey"
            columns: ["institution_type_id"]
            isOneToOne: false
            referencedRelation: "school_institution_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "school_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_religious_affiliation_id_fkey"
            columns: ["religious_affiliation_id"]
            isOneToOne: false
            referencedRelation: "school_religious_affiliations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_application_deposits: {
        Row: {
          amount: number | null
          application_id: string
          assigned_to: string | null
          created_at: string | null
          deposit_date: string | null
          discount: number | null
          has_commission: boolean | null
          id: string
          legacy_last_update: string | null
          legacy_school_id: number | null
          legacy_student_code: string | null
          remarks: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          application_id: string
          assigned_to?: string | null
          created_at?: string | null
          deposit_date?: string | null
          discount?: number | null
          has_commission?: boolean | null
          id?: string
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_student_code?: string | null
          remarks?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          application_id?: string
          assigned_to?: string | null
          created_at?: string | null
          deposit_date?: string | null
          discount?: number | null
          has_commission?: boolean | null
          id?: string
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_student_code?: string | null
          remarks?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_applications: {
        Row: {
          aa_remarks: string | null
          assigned_to: string | null
          course_detail: string | null
          course_id: number | null
          course_start_month: number | null
          course_start_year: number | null
          created_at: string | null
          entry_month: number | null
          entry_year: string | null
          entry_year_value: number | null
          event_date: string | null
          event_id: string | null
          event_time: string | null
          id: string
          is_archived: boolean | null
          is_referral: boolean | null
          legacy_course: string | null
          legacy_event_name: string | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          legacy_status: string | null
          legacy_student_code: string | null
          legacy_sub_status: string | null
          mode_id: number | null
          music_audition: string | null
          registration_date: string | null
          remarks_to_school: string | null
          result_remarks: string | null
          scholarship_amount: number | null
          scholarship_detail: string | null
          school_id: string
          status_id: number | null
          student_id: string
          sub_status_id: number | null
          updated_at: string | null
        }
        Insert: {
          aa_remarks?: string | null
          assigned_to?: string | null
          course_detail?: string | null
          course_id?: number | null
          course_start_month?: number | null
          course_start_year?: number | null
          created_at?: string | null
          entry_month?: number | null
          entry_year?: string | null
          entry_year_value?: number | null
          event_date?: string | null
          event_id?: string | null
          event_time?: string | null
          id?: string
          is_archived?: boolean | null
          is_referral?: boolean | null
          legacy_course?: string | null
          legacy_event_name?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_status?: string | null
          legacy_student_code?: string | null
          legacy_sub_status?: string | null
          mode_id?: number | null
          music_audition?: string | null
          registration_date?: string | null
          remarks_to_school?: string | null
          result_remarks?: string | null
          scholarship_amount?: number | null
          scholarship_detail?: string | null
          school_id: string
          status_id?: number | null
          student_id: string
          sub_status_id?: number | null
          updated_at?: string | null
        }
        Update: {
          aa_remarks?: string | null
          assigned_to?: string | null
          course_detail?: string | null
          course_id?: number | null
          course_start_month?: number | null
          course_start_year?: number | null
          created_at?: string | null
          entry_month?: number | null
          entry_year?: string | null
          entry_year_value?: number | null
          event_date?: string | null
          event_id?: string | null
          event_time?: string | null
          id?: string
          is_archived?: boolean | null
          is_referral?: boolean | null
          legacy_course?: string | null
          legacy_event_name?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_status?: string | null
          legacy_student_code?: string | null
          legacy_sub_status?: string | null
          mode_id?: number | null
          music_audition?: string | null
          registration_date?: string | null
          remarks_to_school?: string | null
          result_remarks?: string | null
          scholarship_amount?: number | null
          scholarship_detail?: string | null
          school_id?: string
          status_id?: number | null
          student_id?: string
          sub_status_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_contacts: {
        Row: {
          address_1: string | null
          address_2: string | null
          created_at: string | null
          created_by: string | null
          email_1: string | null
          email_2: string | null
          email_3: string | null
          fax: string | null
          first_name: string | null
          gender: string | null
          id: string
          legacy_last_update: string | null
          mobile: string | null
          occupation: string | null
          office_fax: string | null
          office_telephone: string | null
          priority: number | null
          relationship_id: number | null
          remarks: string | null
          staff_id: string | null
          status: string | null
          student_id: string
          surname: string | null
          telephone: string | null
          title_id: number | null
          updated_at: string | null
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          created_at?: string | null
          created_by?: string | null
          email_1?: string | null
          email_2?: string | null
          email_3?: string | null
          fax?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          legacy_last_update?: string | null
          mobile?: string | null
          occupation?: string | null
          office_fax?: string | null
          office_telephone?: string | null
          priority?: number | null
          relationship_id?: number | null
          remarks?: string | null
          staff_id?: string | null
          status?: string | null
          student_id: string
          surname?: string | null
          telephone?: string | null
          title_id?: number | null
          updated_at?: string | null
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          created_at?: string | null
          created_by?: string | null
          email_1?: string | null
          email_2?: string | null
          email_3?: string | null
          fax?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          legacy_last_update?: string | null
          mobile?: string | null
          occupation?: string | null
          office_fax?: string | null
          office_telephone?: string | null
          priority?: number | null
          relationship_id?: number | null
          remarks?: string | null
          staff_id?: string | null
          status?: string | null
          student_id?: string
          surname?: string | null
          telephone?: string | null
          title_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_contacts_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "contact_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_contacts_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "contact_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_education: {
        Row: {
          assigned_to: string | null
          course_id: number | null
          created_at: string | null
          email_sent: boolean | null
          end_date: string | null
          id: string
          legacy_course_name: string | null
          legacy_last_update: string | null
          legacy_student_code: string | null
          remarks: string | null
          start_date: string | null
          status_id: number | null
          student_id: string
          total_hours: string | null
          tutor: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          course_id?: number | null
          created_at?: string | null
          email_sent?: boolean | null
          end_date?: string | null
          id?: string
          legacy_course_name?: string | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          remarks?: string | null
          start_date?: string | null
          status_id?: number | null
          student_id: string
          total_hours?: string | null
          tutor?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          course_id?: number | null
          created_at?: string | null
          email_sent?: boolean | null
          end_date?: string | null
          id?: string
          legacy_course_name?: string | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          remarks?: string | null
          start_date?: string | null
          status_id?: number | null
          student_id?: string
          total_hours?: string | null
          tutor?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_education_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_education_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "education_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_education_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "education_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_education_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exam_results: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          exam_type_id: number | null
          id: string
          legacy_course: string | null
          legacy_exam: string | null
          legacy_last_update: string | null
          legacy_student_code: string | null
          max_score: number | null
          paper_id: number | null
          paper_ready: boolean | null
          remarks: string | null
          school_id: string | null
          score: number | null
          status_id: number | null
          student_id: string
          subject_id: number | null
          test_date: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          exam_type_id?: number | null
          id?: string
          legacy_course?: string | null
          legacy_exam?: string | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          max_score?: number | null
          paper_id?: number | null
          paper_ready?: boolean | null
          remarks?: string | null
          school_id?: string | null
          score?: number | null
          status_id?: number | null
          student_id: string
          subject_id?: number | null
          test_date?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          exam_type_id?: number | null
          id?: string
          legacy_course?: string | null
          legacy_exam?: string | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          max_score?: number | null
          paper_id?: number | null
          paper_ready?: boolean | null
          remarks?: string | null
          school_id?: string | null
          score?: number | null
          status_id?: number | null
          student_id?: string
          subject_id?: number | null
          test_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_results_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_results_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "exam_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_results_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "exam_result_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_event_applications: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          email_sent: boolean | null
          event_id: string | null
          id: string
          legacy_event_name: string | null
          legacy_last_update: string | null
          legacy_student_code: string | null
          remarks: string | null
          status_id: number | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          event_id?: string | null
          id?: string
          legacy_event_name?: string | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          remarks?: string | null
          status_id?: number | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          event_id?: string | null
          id?: string
          legacy_event_name?: string | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          remarks?: string | null
          status_id?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_event_apps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_event_apps_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "event_application_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_event_apps_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_travel: {
        Row: {
          airline_id: number | null
          airport_id: number | null
          arrival_date: string | null
          arrival_time: string | null
          assigned_to: string | null
          created_at: string | null
          fee: number | null
          flight_number: string | null
          id: string
          journey_no: number | null
          legacy_airline: string | null
          legacy_airport: string | null
          legacy_last_update: string | null
          legacy_pickup_status: string | null
          legacy_student_code: string | null
          meeting_point_details: string | null
          pickup_by: string | null
          pickup_provider_id: number | null
          pickup_status_id: number | null
          remarks: string | null
          requires_pickup: boolean | null
          route: number | null
          status_id: number | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          airline_id?: number | null
          airport_id?: number | null
          arrival_date?: string | null
          arrival_time?: string | null
          assigned_to?: string | null
          created_at?: string | null
          fee?: number | null
          flight_number?: string | null
          id?: string
          journey_no?: number | null
          legacy_airline?: string | null
          legacy_airport?: string | null
          legacy_last_update?: string | null
          legacy_pickup_status?: string | null
          legacy_student_code?: string | null
          meeting_point_details?: string | null
          pickup_by?: string | null
          pickup_provider_id?: number | null
          pickup_status_id?: number | null
          remarks?: string | null
          requires_pickup?: boolean | null
          route?: number | null
          status_id?: number | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          airline_id?: number | null
          airport_id?: number | null
          arrival_date?: string | null
          arrival_time?: string | null
          assigned_to?: string | null
          created_at?: string | null
          fee?: number | null
          flight_number?: string | null
          id?: string
          journey_no?: number | null
          legacy_airline?: string | null
          legacy_airport?: string | null
          legacy_last_update?: string | null
          legacy_pickup_status?: string | null
          legacy_student_code?: string | null
          meeting_point_details?: string | null
          pickup_by?: string | null
          pickup_provider_id?: number | null
          pickup_status_id?: number | null
          remarks?: string | null
          requires_pickup?: boolean | null
          route?: number | null
          status_id?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_travel_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_travel_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_travel_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_travel_pickup_provider_id_fkey"
            columns: ["pickup_provider_id"]
            isOneToOne: false
            referencedRelation: "pickup_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_travel_pickup_status_id_fkey"
            columns: ["pickup_status_id"]
            isOneToOne: false
            referencedRelation: "pickup_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_travel_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "travel_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_travel_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_statuses: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      student_statuses: {
        Row: {
          code: string
          color: string | null
          description: string | null
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          color?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          color?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      students: {
        Row: {
          aa_news: boolean | null
          address_line_1: string | null
          legacy_address_line_2: string | null
          airport_pickup: boolean | null
          chinese_address: string | null
          chinese_address_1: string | null
          chinese_address_2: string | null
          chinese_name: string | null
          course_id: number | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          education_remarks: string | null
          email: string | null
          enrollment_date: string | null
          entry_month: number | null
          entry_year: number | null
          exam_paper: string | null
          fax: string | null
          first_name: string
          gender: string | null
          id: string
          lead_source_2: string | null
          lead_source_3: string | null
          lead_source_4: string | null
          lead_source_5: string | null
          lead_source_id: number | null
          legacy_entry_year: string | null
          legacy_last_update: string | null
          login_name: string | null
          mobile: string | null
          nationality_id: number | null
          passport_copy_url: string | null
          passport_number: string | null
          passport_type: string | null
          photo_url: string | null
          placement_id: number | null
          placement_remarks: string | null
          present_school: string | null
          present_school_type_id: number | null
          remarks: string | null
          sixth_form: string | null
          staff_id: string | null
          status_id: number | null
          student_code: string | null
          surname: string
          telephone: string | null
          temp_id: string | null
          updated_at: string | null
        }
        Insert: {
          aa_news?: boolean | null
          address_line_1?: string | null
          legacy_address_line_2?: string | null
          airport_pickup?: boolean | null
          chinese_address?: string | null
          chinese_address_1?: string | null
          chinese_address_2?: string | null
          chinese_name?: string | null
          course_id?: number | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          education_remarks?: string | null
          email?: string | null
          enrollment_date?: string | null
          entry_month?: number | null
          entry_year?: number | null
          exam_paper?: string | null
          fax?: string | null
          first_name: string
          gender?: string | null
          id?: string
          lead_source_2?: string | null
          lead_source_3?: string | null
          lead_source_4?: string | null
          lead_source_5?: string | null
          lead_source_id?: number | null
          legacy_entry_year?: string | null
          legacy_last_update?: string | null
          login_name?: string | null
          mobile?: string | null
          nationality_id?: number | null
          passport_copy_url?: string | null
          passport_number?: string | null
          passport_type?: string | null
          photo_url?: string | null
          placement_id?: number | null
          placement_remarks?: string | null
          present_school?: string | null
          present_school_type_id?: number | null
          remarks?: string | null
          sixth_form?: string | null
          staff_id?: string | null
          status_id?: number | null
          student_code?: string | null
          surname: string
          telephone?: string | null
          temp_id?: string | null
          updated_at?: string | null
        }
        Update: {
          aa_news?: boolean | null
          address_line_1?: string | null
          legacy_address_line_2?: string | null
          airport_pickup?: boolean | null
          chinese_address?: string | null
          chinese_address_1?: string | null
          chinese_address_2?: string | null
          chinese_name?: string | null
          course_id?: number | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          education_remarks?: string | null
          email?: string | null
          enrollment_date?: string | null
          entry_month?: number | null
          entry_year?: number | null
          exam_paper?: string | null
          fax?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          lead_source_2?: string | null
          lead_source_3?: string | null
          lead_source_4?: string | null
          lead_source_5?: string | null
          lead_source_id?: number | null
          legacy_entry_year?: string | null
          legacy_last_update?: string | null
          login_name?: string | null
          mobile?: string | null
          nationality_id?: number | null
          passport_copy_url?: string | null
          passport_number?: string | null
          passport_type?: string | null
          photo_url?: string | null
          placement_id?: number | null
          placement_remarks?: string | null
          present_school?: string | null
          present_school_type_id?: number | null
          remarks?: string | null
          sixth_form?: string | null
          staff_id?: string | null
          status_id?: number | null
          student_code?: string | null
          surname?: string
          telephone?: string | null
          temp_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "nationalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placement_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_present_school_type_id_fkey"
            columns: ["present_school_type_id"]
            isOneToOne: false
            referencedRelation: "school_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "student_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_visas: {
        Row: {
          amount: number | null
          application: string | null
          appointment: boolean | null
          appointment_date: string | null
          assigned_to: string | null
          cas_received: boolean | null
          created_at: string | null
          entry_month: number | null
          entry_year: string | null
          entry_year_value: number | null
          id: string
          legacy_case_10: boolean | null
          legacy_case_11: boolean | null
          legacy_case_15: boolean | null
          legacy_case_17: boolean | null
          legacy_case_20: boolean | null
          legacy_case_21: boolean | null
          legacy_case_22: boolean | null
          legacy_case_23: boolean | null
          legacy_last_update: string | null
          legacy_school_name: string | null
          legacy_student_code: string | null
          passport_received: boolean | null
          passport_sent_to_school: boolean | null
          receipt: string | null
          remarks: string | null
          request_sent_to_parent: boolean | null
          school_id: string | null
          sent_visa_information: boolean | null
          status_id: number | null
          student_id: string
          updated_at: string | null
          visa_copy: boolean | null
          visa_copy_sent: boolean | null
          visa_granted: boolean | null
        }
        Insert: {
          amount?: number | null
          application?: string | null
          appointment?: boolean | null
          appointment_date?: string | null
          assigned_to?: string | null
          cas_received?: boolean | null
          created_at?: string | null
          entry_month?: number | null
          entry_year?: string | null
          entry_year_value?: number | null
          id?: string
          legacy_case_10?: boolean | null
          legacy_case_11?: boolean | null
          legacy_case_15?: boolean | null
          legacy_case_17?: boolean | null
          legacy_case_20?: boolean | null
          legacy_case_21?: boolean | null
          legacy_case_22?: boolean | null
          legacy_case_23?: boolean | null
          legacy_last_update?: string | null
          legacy_school_name?: string | null
          legacy_student_code?: string | null
          passport_received?: boolean | null
          passport_sent_to_school?: boolean | null
          receipt?: string | null
          remarks?: string | null
          request_sent_to_parent?: boolean | null
          school_id?: string | null
          sent_visa_information?: boolean | null
          status_id?: number | null
          student_id: string
          updated_at?: string | null
          visa_copy?: boolean | null
          visa_copy_sent?: boolean | null
          visa_granted?: boolean | null
        }
        Update: {
          amount?: number | null
          application?: string | null
          appointment?: boolean | null
          appointment_date?: string | null
          assigned_to?: string | null
          cas_received?: boolean | null
          created_at?: string | null
          entry_month?: number | null
          entry_year?: string | null
          entry_year_value?: number | null
          id?: string
          legacy_case_10?: boolean | null
          legacy_case_11?: boolean | null
          legacy_case_15?: boolean | null
          legacy_case_17?: boolean | null
          legacy_case_20?: boolean | null
          legacy_case_21?: boolean | null
          legacy_case_22?: boolean | null
          legacy_case_23?: boolean | null
          legacy_last_update?: string | null
          legacy_school_name?: string | null
          legacy_student_code?: string | null
          passport_received?: boolean | null
          passport_sent_to_school?: boolean | null
          receipt?: string | null
          remarks?: string | null
          request_sent_to_parent?: boolean | null
          school_id?: string | null
          sent_visa_information?: boolean | null
          status_id?: number | null
          student_id?: string
          updated_at?: string | null
          visa_copy?: boolean | null
          visa_copy_sent?: boolean | null
          visa_granted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "student_visas_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_visas_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_visas_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "visa_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_visas_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_statuses: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
