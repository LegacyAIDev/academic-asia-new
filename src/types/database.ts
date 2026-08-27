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
      academic_exam_types: {
        Row: {
          code: string
          country: string | null
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          country?: string | null
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          country?: string | null
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      admin_level_permissions: {
        Row: {
          access: number
          admin_level: number
          module_id: number
        }
        Insert: {
          access?: number
          admin_level: number
          module_id: number
        }
        Update: {
          access?: number
          admin_level?: number
          module_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_level_permissions_admin_level_fkey"
            columns: ["admin_level"]
            isOneToOne: false
            referencedRelation: "admin_levels"
            referencedColumns: ["level"]
          },
          {
            foreignKeyName: "admin_level_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "permission_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_levels: {
        Row: {
          description: string | null
          id: number
          label: string
          level: number
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          id?: number
          label: string
          level: number
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          id?: number
          label?: string
          level?: number
          sort_order?: number | null
        }
        Relationships: []
      }
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
      bank_account_types: {
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
      currencies: {
        Row: {
          code: string
          id: number
          is_active: boolean | null
          label: string
          sort_order: number | null
          symbol: string | null
        }
        Insert: {
          code: string
          id?: number
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          symbol?: string | null
        }
        Update: {
          code?: string
          id?: number
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          symbol?: string | null
        }
        Relationships: []
      }
      delivery_modes: {
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
      departments: {
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
      document_categories: {
        Row: {
          code: string
          id: number
          label: string
          section: string | null
          sort_order: number | null
        }
        Insert: {
          code: string
          id?: number
          label: string
          section?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          id?: number
          label?: string
          section?: string | null
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
      enquiry_action_types: {
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
      entrance_exam_types: {
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
      event_categories: {
        Row: {
          code: string
          description: string | null
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          description?: string | null
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          description?: string | null
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      event_exam_blocks: {
        Row: {
          allowed_items: string | null
          apply_year: string | null
          attachment_path: string | null
          capacity: number | null
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          event_id: string
          id: string
          invigilator_names: string | null
          name: string | null
          sort_order: number | null
          special_instructions: string | null
          start_time: string | null
          subject: string | null
          updated_at: string | null
          venue_room: string | null
        }
        Insert: {
          allowed_items?: string | null
          apply_year?: string | null
          attachment_path?: string | null
          capacity?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_id: string
          id?: string
          invigilator_names?: string | null
          name?: string | null
          sort_order?: number | null
          special_instructions?: string | null
          start_time?: string | null
          subject?: string | null
          updated_at?: string | null
          venue_room?: string | null
        }
        Update: {
          allowed_items?: string | null
          apply_year?: string | null
          attachment_path?: string | null
          capacity?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_id?: string
          id?: string
          invigilator_names?: string | null
          name?: string | null
          sort_order?: number | null
          special_instructions?: string | null
          start_time?: string | null
          subject?: string | null
          updated_at?: string | null
          venue_room?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_exam_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_exams: {
        Row: {
          application_deadline: string | null
          apply_year: string | null
          assigned_to: string | null
          created_at: string | null
          entrance_exam_date: string | null
          event_id: string
          id: string
          is_confirmed: boolean | null
          legacy_event_id: number | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          legacy_table: string | null
          remarks: string | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          application_deadline?: string | null
          apply_year?: string | null
          assigned_to?: string | null
          created_at?: string | null
          entrance_exam_date?: string | null
          event_id: string
          id?: string
          is_confirmed?: boolean | null
          legacy_event_id?: number | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_table?: string | null
          remarks?: string | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          application_deadline?: string | null
          apply_year?: string | null
          assigned_to?: string | null
          created_at?: string | null
          entrance_exam_date?: string | null
          event_id?: string
          id?: string
          is_confirmed?: boolean | null
          legacy_event_id?: number | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_table?: string | null
          remarks?: string | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_exams_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_exams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      event_representatives: {
        Row: {
          assigned_to: string | null
          available_from: string | null
          available_to: string | null
          created_at: string | null
          event_id: string
          id: string
          legacy_event_id: number | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          legacy_table: string | null
          name: string
          remarks: string | null
          role: string | null
          school_contact_id: string | null
          school_id: string | null
          slot_length_minutes: number | null
          updated_at: string | null
          venue_room: string | null
        }
        Insert: {
          assigned_to?: string | null
          available_from?: string | null
          available_to?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          legacy_event_id?: number | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_table?: string | null
          name: string
          remarks?: string | null
          role?: string | null
          school_contact_id?: string | null
          school_id?: string | null
          slot_length_minutes?: number | null
          updated_at?: string | null
          venue_room?: string | null
        }
        Update: {
          assigned_to?: string | null
          available_from?: string | null
          available_to?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          legacy_event_id?: number | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_table?: string | null
          name?: string
          remarks?: string | null
          role?: string | null
          school_contact_id?: string | null
          school_id?: string | null
          slot_length_minutes?: number | null
          updated_at?: string | null
          venue_room?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_interviewers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interviewers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interviewers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_representatives_school_contact_id_fkey"
            columns: ["school_contact_id"]
            isOneToOne: false
            referencedRelation: "school_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_results: {
        Row: {
          assigned_to: string | null
          composer: string | null
          created_at: string | null
          event_id: string | null
          id: string
          legacy_event_name: string | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          legacy_student_code: string | null
          offer: string | null
          piece: string | null
          priority: number | null
          qualification: string | null
          remarks: string | null
          school_id: string | null
          score: string | null
          student_id: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          composer?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          legacy_event_name?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_student_code?: string | null
          offer?: string | null
          piece?: string | null
          priority?: number | null
          qualification?: string | null
          remarks?: string | null
          school_id?: string | null
          score?: string | null
          student_id: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          composer?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          legacy_event_name?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_student_code?: string | null
          offer?: string | null
          piece?: string | null
          priority?: number | null
          qualification?: string | null
          remarks?: string | null
          school_id?: string | null
          score?: string | null
          student_id?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_results_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedules: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          end_time: string | null
          event_id: string
          id: string
          interviewer_name: string | null
          is_blocker: boolean
          legacy_event_id: number | null
          legacy_last_update: string | null
          legacy_student_code: string | null
          legacy_table: string | null
          remarks: string | null
          representative_id: string | null
          schedule_date: string | null
          start_time: string | null
          student_id: string | null
          timeslot: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          interviewer_name?: string | null
          is_blocker?: boolean
          legacy_event_id?: number | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          legacy_table?: string | null
          remarks?: string | null
          representative_id?: string | null
          schedule_date?: string | null
          start_time?: string | null
          student_id?: string | null
          timeslot?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          interviewer_name?: string | null
          is_blocker?: boolean
          legacy_event_id?: number | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          legacy_table?: string | null
          remarks?: string | null
          representative_id?: string | null
          schedule_date?: string | null
          start_time?: string | null
          student_id?: string | null
          timeslot?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedules_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "event_representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schools: {
        Row: {
          application_deadline: string | null
          application_deadline_remarks: string | null
          assigned_to: string | null
          created_at: string | null
          event_id: string
          event_remarks: string | null
          id: string
          is_confirmed: boolean | null
          is_school_confirmed: boolean | null
          legacy_event_id: number | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          legacy_table: string | null
          payable_to: string | null
          registration_fee: string | null
          remarks: string | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          application_deadline?: string | null
          application_deadline_remarks?: string | null
          assigned_to?: string | null
          created_at?: string | null
          event_id: string
          event_remarks?: string | null
          id?: string
          is_confirmed?: boolean | null
          is_school_confirmed?: boolean | null
          legacy_event_id?: number | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_table?: string | null
          payable_to?: string | null
          registration_fee?: string | null
          remarks?: string | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          application_deadline?: string | null
          application_deadline_remarks?: string | null
          assigned_to?: string | null
          created_at?: string | null
          event_id?: string
          event_remarks?: string | null
          id?: string
          is_confirmed?: boolean | null
          is_school_confirmed?: boolean | null
          legacy_event_id?: number | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          legacy_table?: string | null
          payable_to?: string | null
          registration_fee?: string | null
          remarks?: string | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_schools_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schools_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          category_id: number | null
          code: string
          color: string | null
          description: string | null
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          category_id?: number | null
          code: string
          color?: string | null
          description?: string | null
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          category_id?: number | null
          code?: string
          color?: string | null
          description?: string | null
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      event_visibilities: {
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
      events: {
        Row: {
          assigned_to: string | null
          capacity: number | null
          category_id: number | null
          created_at: string | null
          created_by: string | null
          delivery_mode_id: number | null
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
          online_link: string | null
          parent_event_id: string | null
          remarks: string | null
          scheduling_mode_id: number | null
          school_id: string | null
          start_date: string | null
          start_time: string | null
          updated_at: string | null
          visibility_id: number | null
        }
        Insert: {
          assigned_to?: string | null
          capacity?: number | null
          category_id?: number | null
          created_at?: string | null
          created_by?: string | null
          delivery_mode_id?: number | null
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
          online_link?: string | null
          parent_event_id?: string | null
          remarks?: string | null
          scheduling_mode_id?: number | null
          school_id?: string | null
          start_date?: string | null
          start_time?: string | null
          updated_at?: string | null
          visibility_id?: number | null
        }
        Update: {
          assigned_to?: string | null
          capacity?: number | null
          category_id?: number | null
          created_at?: string | null
          created_by?: string | null
          delivery_mode_id?: number | null
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
          online_link?: string | null
          parent_event_id?: string | null
          remarks?: string | null
          scheduling_mode_id?: number | null
          school_id?: string | null
          start_date?: string | null
          start_time?: string | null
          updated_at?: string | null
          visibility_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_delivery_mode_id_fkey"
            columns: ["delivery_mode_id"]
            isOneToOne: false
            referencedRelation: "delivery_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_scheduling_mode_id_fkey"
            columns: ["scheduling_mode_id"]
            isOneToOne: false
            referencedRelation: "scheduling_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_visibility_id_fkey"
            columns: ["visibility_id"]
            isOneToOne: false
            referencedRelation: "event_visibilities"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_booking_statuses: {
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
      fee_types: {
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
      individual_exam_types: {
        Row: {
          code: string
          has_score: boolean | null
          id: number
          label: string
          requires_school: boolean | null
          sort_order: number | null
        }
        Insert: {
          code: string
          has_score?: boolean | null
          id?: number
          label: string
          requires_school?: boolean | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          has_score?: boolean | null
          id?: number
          label?: string
          requires_school?: boolean | null
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
      music_instruments: {
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
      officer_role_types: {
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
      permission_modules: {
        Row: {
          id: number
          key: string
          label: string
          sort_order: number | null
        }
        Insert: {
          id?: number
          key: string
          label: string
          sort_order?: number | null
        }
        Update: {
          id?: number
          key?: string
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
      profile_permission_overrides: {
        Row: {
          access: number
          module_id: number
          profile_id: string
        }
        Insert: {
          access: number
          module_id: number
          profile_id: string
        }
        Update: {
          access?: number
          module_id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_permission_overrides_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "permission_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_permission_overrides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_level: number | null
          created_at: string | null
          daily_case_count: number | null
          department_id: number | null
          email_1: string | null
          email_2: string | null
          fax: string | null
          first_name: string | null
          id: string
          join_date: string | null
          legacy_id: string | null
          mobile: string | null
          position: string | null
          remarks: string | null
          surname: string | null
          telephone: string | null
          updated_at: string | null
          weekly_case_count: number | null
          yearly_case_count: number | null
        }
        Insert: {
          admin_level?: number | null
          created_at?: string | null
          daily_case_count?: number | null
          department_id?: number | null
          email_1?: string | null
          email_2?: string | null
          fax?: string | null
          first_name?: string | null
          id: string
          join_date?: string | null
          legacy_id?: string | null
          mobile?: string | null
          position?: string | null
          remarks?: string | null
          surname?: string | null
          telephone?: string | null
          updated_at?: string | null
          weekly_case_count?: number | null
          yearly_case_count?: number | null
        }
        Update: {
          admin_level?: number | null
          created_at?: string | null
          daily_case_count?: number | null
          department_id?: number | null
          email_1?: string | null
          email_2?: string | null
          fax?: string | null
          first_name?: string | null
          id?: string
          join_date?: string | null
          legacy_id?: string | null
          mobile?: string | null
          position?: string | null
          remarks?: string | null
          surname?: string | null
          telephone?: string | null
          updated_at?: string | null
          weekly_case_count?: number | null
          yearly_case_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_admin_level_fkey"
            columns: ["admin_level"]
            isOneToOne: false
            referencedRelation: "admin_levels"
            referencedColumns: ["level"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_types: {
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
      scheduling_modes: {
        Row: {
          code: string
          description: string | null
          id: number
          label: string
          sort_order: number | null
        }
        Insert: {
          code: string
          description?: string | null
          id?: number
          label: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          description?: string | null
          id?: number
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      school_academic_results: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          exam_type_id: number | null
          exam_year: number | null
          grade_from: string | null
          grade_to: string | null
          id: string
          legacy_exam_type: string | null
          legacy_grade_range: string | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          remarks: string | null
          result_percentage: number | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          exam_type_id?: number | null
          exam_year?: number | null
          grade_from?: string | null
          grade_to?: string | null
          id?: string
          legacy_exam_type?: string | null
          legacy_grade_range?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          result_percentage?: number | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          exam_type_id?: number | null
          exam_year?: number | null
          grade_from?: string | null
          grade_to?: string | null
          id?: string
          legacy_exam_type?: string | null
          legacy_grade_range?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          result_percentage?: number | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_academic_results_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_academic_results_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "academic_exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_academic_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_bank_details: {
        Row: {
          account_holder: string | null
          account_number: string | null
          account_type_id: number | null
          assigned_to: string | null
          bank_address: string | null
          bank_name: string | null
          billing_name: string | null
          created_at: string | null
          currency_id: number | null
          iban_number: string | null
          id: string
          legacy_last_update: string | null
          legacy_school_id: number | null
          remarks: string | null
          school_id: string
          sort_code: string | null
          swift_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          account_type_id?: number | null
          assigned_to?: string | null
          bank_address?: string | null
          bank_name?: string | null
          billing_name?: string | null
          created_at?: string | null
          currency_id?: number | null
          iban_number?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          school_id: string
          sort_code?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          account_type_id?: number | null
          assigned_to?: string | null
          bank_address?: string | null
          bank_name?: string | null
          billing_name?: string | null
          created_at?: string | null
          currency_id?: number | null
          iban_number?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          school_id?: string
          sort_code?: string | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_bank_details_account_type_id_fkey"
            columns: ["account_type_id"]
            isOneToOne: false
            referencedRelation: "bank_account_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bank_details_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bank_details_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bank_details_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_coed_from: {
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
      school_contacts: {
        Row: {
          address_1: string | null
          address_2: string | null
          assigned_to: string | null
          created_at: string | null
          email_1: string | null
          email_2: string | null
          email_3: string | null
          fax: string | null
          first_name: string | null
          gender: string | null
          id: string
          is_active: boolean
          legacy_last_update: string | null
          legacy_school_id: number | null
          mobile: string | null
          position: string | null
          priority: number | null
          remarks: string | null
          responsible: string | null
          school_id: string
          surname: string | null
          telephone: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          assigned_to?: string | null
          created_at?: string | null
          email_1?: string | null
          email_2?: string | null
          email_3?: string | null
          fax?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          mobile?: string | null
          position?: string | null
          priority?: number | null
          remarks?: string | null
          responsible?: string | null
          school_id: string
          surname?: string | null
          telephone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          assigned_to?: string | null
          created_at?: string | null
          email_1?: string | null
          email_2?: string | null
          email_3?: string | null
          fax?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          mobile?: string | null
          position?: string | null
          priority?: number | null
          remarks?: string | null
          responsible?: string | null
          school_id?: string
          surname?: string | null
          telephone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_contacts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_courses: {
        Row: {
          assigned_to: string | null
          course_date: string | null
          course_id: number
          created_at: string | null
          description: string | null
          id: string
          legacy_course_name: string | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          name: string | null
          remarks: string | null
          school_id: string
          school_year: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          course_date?: string | null
          course_id: number
          created_at?: string | null
          description?: string | null
          id?: string
          legacy_course_name?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          name?: string | null
          remarks?: string | null
          school_id: string
          school_year?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          course_date?: string | null
          course_id?: number
          created_at?: string | null
          description?: string | null
          id?: string
          legacy_course_name?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          name?: string | null
          remarks?: string | null
          school_id?: string
          school_year?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_courses_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_documents: {
        Row: {
          academic_year: string | null
          attachable_id: string | null
          attachable_type: string | null
          category_id: number
          created_at: string | null
          external_url: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_music_audition: boolean | null
          mime_type: string | null
          school_id: string
          source_file_name: string | null
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
          year_level: string | null
        }
        Insert: {
          academic_year?: string | null
          attachable_id?: string | null
          attachable_type?: string | null
          category_id: number
          created_at?: string | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_music_audition?: boolean | null
          mime_type?: string | null
          school_id: string
          source_file_name?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          year_level?: string | null
        }
        Update: {
          academic_year?: string | null
          attachable_id?: string | null
          attachable_type?: string | null
          category_id?: number
          created_at?: string | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_music_audition?: boolean | null
          mime_type?: string | null
          school_id?: string
          source_file_name?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          year_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_entrance_exams: {
        Row: {
          aa_remarks: string | null
          assigned_to: string | null
          created_at: string | null
          duration_minutes: number | null
          entry_year: string | null
          exam_format: string | null
          exam_type_id: number | null
          files: string | null
          has_paper: boolean | null
          id: string
          legacy_exam_type: string | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          remarks: string | null
          school_id: string
          subject: string | null
          updated_at: string | null
          year_level: string | null
        }
        Insert: {
          aa_remarks?: string | null
          assigned_to?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          entry_year?: string | null
          exam_format?: string | null
          exam_type_id?: number | null
          files?: string | null
          has_paper?: boolean | null
          id?: string
          legacy_exam_type?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          school_id: string
          subject?: string | null
          updated_at?: string | null
          year_level?: string | null
        }
        Update: {
          aa_remarks?: string | null
          assigned_to?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          entry_year?: string | null
          exam_format?: string | null
          exam_type_id?: number | null
          files?: string | null
          has_paper?: boolean | null
          id?: string
          legacy_exam_type?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          school_id?: string
          subject?: string | null
          updated_at?: string | null
          year_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_entrance_exams_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_entrance_exams_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "entrance_exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_entrance_exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_fees: {
        Row: {
          amount: number | null
          assigned_to: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          fee_type_id: number | null
          financial_year: string | null
          id: string
          legacy_fee_type: string | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          payable_to: string | null
          remarks: string | null
          school_id: string
          start_date: string | null
          updated_at: string | null
          year_level_from: string | null
          year_level_to: string | null
          year_levels: string | null
        }
        Insert: {
          amount?: number | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fee_type_id?: number | null
          financial_year?: string | null
          id?: string
          legacy_fee_type?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          payable_to?: string | null
          remarks?: string | null
          school_id: string
          start_date?: string | null
          updated_at?: string | null
          year_level_from?: string | null
          year_level_to?: string | null
          year_levels?: string | null
        }
        Update: {
          amount?: number | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fee_type_id?: number | null
          financial_year?: string | null
          id?: string
          legacy_fee_type?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          payable_to?: string | null
          remarks?: string | null
          school_id?: string
          start_date?: string | null
          updated_at?: string | null
          year_level_from?: string | null
          year_level_to?: string | null
          year_levels?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_fees_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fees_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      school_note_categories: {
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
      school_notes: {
        Row: {
          assigned_to: string | null
          category_id: number | null
          created_at: string | null
          detail: string | null
          id: string
          is_flagged: boolean | null
          legacy_category: string | null
          legacy_last_update: string | null
          legacy_school_id: number | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category_id?: number | null
          created_at?: string | null
          detail?: string | null
          id?: string
          is_flagged?: boolean | null
          legacy_category?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category_id?: number | null
          created_at?: string | null
          detail?: string | null
          id?: string
          is_flagged?: boolean | null
          legacy_category?: string | null
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_notes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_notes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "school_note_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_notes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      school_sup_info_categories: {
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
      school_supplementary_info: {
        Row: {
          assigned_to: string | null
          category_id: number | null
          created_at: string | null
          id: string
          info: string | null
          legacy_info_type: string
          legacy_last_update: string | null
          legacy_school_id: number | null
          remarks: string | null
          school_id: string
          school_year: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category_id?: number | null
          created_at?: string | null
          id?: string
          info?: string | null
          legacy_info_type: string
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          school_id: string
          school_year?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category_id?: number | null
          created_at?: string | null
          id?: string
          info?: string | null
          legacy_info_type?: string
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          school_id?: string
          school_year?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_supplementary_info_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_supplementary_info_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "school_sup_info_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_supplementary_info_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      school_visits: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          legacy_last_update: string | null
          legacy_school_id: number | null
          remarks: string | null
          result: string | null
          school_contact: string | null
          school_id: string
          updated_at: string | null
          visit_date: string | null
          visit_log: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          result?: string | null
          school_contact?: string | null
          school_id: string
          updated_at?: string | null
          visit_date?: string | null
          visit_log?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_school_id?: number | null
          remarks?: string | null
          result?: string | null
          school_contact?: string | null
          school_id?: string
          updated_at?: string | null
          visit_date?: string | null
          visit_log?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_visits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_visits_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          accepts_applications: boolean | null
          accepts_child_visa: boolean | null
          accepts_general_visa: boolean | null
          address: string | null
          assigned_to: string | null
          boarder_age_max: number | null
          boarder_age_min: number | null
          boarder_count: number | null
          campus_image_url: string | null
          child_visa_age: number | null
          city: string | null
          coed_from_id: number | null
          country_id: number | null
          county: string | null
          county_normalised: string | null
          created_at: string | null
          created_by: string | null
          current_course_fee: number | null
          current_course_fee_year: string | null
          email: string | null
          fax: string | null
          gender_type_id: number | null
          id: string
          institution_type_id: number | null
          keywords: string | null
          latitude: number | null
          legacy_boarder_age_range: string | null
          legacy_id: number | null
          legacy_last_update: string | null
          login_name: string | null
          logo_url: string | null
          longitude: number | null
          map_url: string | null
          name: string
          offers_a_level: boolean | null
          offers_ib: boolean | null
          phase_id: number | null
          postcode: string | null
          pupil_count: number | null
          religious_affiliation_id: number | null
          remarks: string | null
          school_age_max: number | null
          school_age_min: number | null
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
          assigned_to?: string | null
          boarder_age_max?: number | null
          boarder_age_min?: number | null
          boarder_count?: number | null
          campus_image_url?: string | null
          child_visa_age?: number | null
          city?: string | null
          coed_from_id?: number | null
          country_id?: number | null
          county?: string | null
          county_normalised?: string | null
          created_at?: string | null
          created_by?: string | null
          current_course_fee?: number | null
          current_course_fee_year?: string | null
          email?: string | null
          fax?: string | null
          gender_type_id?: number | null
          id?: string
          institution_type_id?: number | null
          keywords?: string | null
          latitude?: number | null
          legacy_boarder_age_range?: string | null
          legacy_id?: number | null
          legacy_last_update?: string | null
          login_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          map_url?: string | null
          name: string
          offers_a_level?: boolean | null
          offers_ib?: boolean | null
          phase_id?: number | null
          postcode?: string | null
          pupil_count?: number | null
          religious_affiliation_id?: number | null
          remarks?: string | null
          school_age_max?: number | null
          school_age_min?: number | null
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
          assigned_to?: string | null
          boarder_age_max?: number | null
          boarder_age_min?: number | null
          boarder_count?: number | null
          campus_image_url?: string | null
          child_visa_age?: number | null
          city?: string | null
          coed_from_id?: number | null
          country_id?: number | null
          county?: string | null
          county_normalised?: string | null
          created_at?: string | null
          created_by?: string | null
          current_course_fee?: number | null
          current_course_fee_year?: string | null
          email?: string | null
          fax?: string | null
          gender_type_id?: number | null
          id?: string
          institution_type_id?: number | null
          keywords?: string | null
          latitude?: number | null
          legacy_boarder_age_range?: string | null
          legacy_id?: number | null
          legacy_last_update?: string | null
          login_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          map_url?: string | null
          name?: string
          offers_a_level?: boolean | null
          offers_ib?: boolean | null
          phase_id?: number | null
          postcode?: string | null
          pupil_count?: number | null
          religious_affiliation_id?: number | null
          remarks?: string | null
          school_age_max?: number | null
          school_age_min?: number | null
          status?: string | null
          telephone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_coed_from_id_fkey"
            columns: ["coed_from_id"]
            isOneToOne: false
            referencedRelation: "school_coed_from"
            referencedColumns: ["id"]
          },
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
      spoken_english_levels: {
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
        Relationships: [
          {
            foreignKeyName: "student_application_deposits_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "student_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_application_deposits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          entry_year: number | null
          entry_year_value: number | null
          event_date: string | null
          event_id: string | null
          event_time: string | null
          id: string
          is_archived: boolean | null
          is_referral: boolean | null
          legacy_course: string | null
          legacy_entry_year: string | null
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
          scholarship_types: string[] | null
          school_contact: string | null
          school_id: string
          status_id: number | null
          student_id: string
          sub_status_id: number | null
          updated_at: string | null
          visit_date: string | null
          visit_remarks: string | null
          visit_time: string | null
          year_group: number | null
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
          entry_year?: number | null
          entry_year_value?: number | null
          event_date?: string | null
          event_id?: string | null
          event_time?: string | null
          id?: string
          is_archived?: boolean | null
          is_referral?: boolean | null
          legacy_course?: string | null
          legacy_entry_year?: string | null
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
          scholarship_types?: string[] | null
          school_contact?: string | null
          school_id: string
          status_id?: number | null
          student_id: string
          sub_status_id?: number | null
          updated_at?: string | null
          visit_date?: string | null
          visit_remarks?: string | null
          visit_time?: string | null
          year_group?: number | null
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
          entry_year?: number | null
          entry_year_value?: number | null
          event_date?: string | null
          event_id?: string | null
          event_time?: string | null
          id?: string
          is_archived?: boolean | null
          is_referral?: boolean | null
          legacy_course?: string | null
          legacy_entry_year?: string | null
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
          scholarship_types?: string[] | null
          school_contact?: string | null
          school_id?: string
          status_id?: number | null
          student_id?: string
          sub_status_id?: number | null
          updated_at?: string | null
          visit_date?: string | null
          visit_remarks?: string | null
          visit_time?: string | null
          year_group?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_applications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_applications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_applications_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "application_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_applications_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "application_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_applications_sub_status_id_fkey"
            columns: ["sub_status_id"]
            isOneToOne: false
            referencedRelation: "application_sub_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_brief_intro: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          created_at: string | null
          hobbies: string | null
          id: string
          is_approved: boolean | null
          legacy_last_update: string | null
          legacy_spoken_english: string | null
          legacy_student_code: string | null
          parents_input: string | null
          remarks: string | null
          spoken_english_id: number | null
          student_id: string
          subjects: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string | null
          hobbies?: string | null
          id?: string
          is_approved?: boolean | null
          legacy_last_update?: string | null
          legacy_spoken_english?: string | null
          legacy_student_code?: string | null
          parents_input?: string | null
          remarks?: string | null
          spoken_english_id?: number | null
          student_id: string
          subjects?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string | null
          hobbies?: string | null
          id?: string
          is_approved?: boolean | null
          legacy_last_update?: string | null
          legacy_spoken_english?: string | null
          legacy_student_code?: string | null
          parents_input?: string | null
          remarks?: string | null
          spoken_english_id?: number | null
          student_id?: string
          subjects?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_brief_intro_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_brief_intro_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_brief_intro_spoken_english_id_fkey"
            columns: ["spoken_english_id"]
            isOneToOne: false
            referencedRelation: "spoken_english_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_brief_intro_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_contacts: {
        Row: {
          address_1: string | null
          address_2: string | null
          assigned_to: string | null
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
          assigned_to?: string | null
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
          assigned_to?: string | null
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
          status?: string | null
          student_id?: string
          surname?: string | null
          telephone?: string | null
          title_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      student_documents: {
        Row: {
          academic_year: string | null
          attachable_id: string | null
          attachable_type: string | null
          category_id: number
          created_at: string | null
          description: string | null
          external_url: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          student_id: string
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          academic_year?: string | null
          attachable_id?: string | null
          attachable_type?: string | null
          category_id: number
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          student_id: string
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          academic_year?: string | null
          attachable_id?: string | null
          attachable_type?: string | null
          category_id?: number
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          student_id?: string
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      student_enquiries: {
        Row: {
          action_type_id: number | null
          assigned_to: string | null
          contact_refused: boolean | null
          created_at: string | null
          enquiry_log: string | null
          id: string
          legacy_last_update: string | null
          legacy_student_code: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          action_type_id?: number | null
          assigned_to?: string | null
          contact_refused?: boolean | null
          created_at?: string | null
          enquiry_log?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          action_type_id?: number | null
          assigned_to?: string | null
          contact_refused?: boolean | null
          created_at?: string | null
          enquiry_log?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_enquiries_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "enquiry_action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enquiries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
          pieces: Json | null
          preferred_time: string | null
          remarks: string | null
          representative_id: string | null
          seats_assigned: number | null
          seats_requested: number | null
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
          pieces?: Json | null
          preferred_time?: string | null
          remarks?: string | null
          representative_id?: string | null
          seats_assigned?: number | null
          seats_requested?: number | null
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
          pieces?: Json | null
          preferred_time?: string | null
          remarks?: string | null
          representative_id?: string | null
          seats_assigned?: number | null
          seats_requested?: number | null
          status_id?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_event_applications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_event_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_event_applications_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "event_representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_event_applications_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "event_application_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_event_applications_student_id_fkey"
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
            foreignKeyName: "student_exam_results_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      student_individual_exams: {
        Row: {
          application_id: string | null
          apply_year: string | null
          assigned_to: string | null
          confirmed_date: string | null
          confirmed_end_time: string | null
          confirmed_start_time: string | null
          created_at: string | null
          created_by: string | null
          delivery_mode_id: number | null
          duration_minutes: number | null
          end_time_calculated: string | null
          exam_type_id: number
          examiner_names: string | null
          id: string
          legacy_action: string | null
          legacy_student_code: string | null
          legacy_test_type: string | null
          location: string | null
          online_link: string | null
          preferred_date: string | null
          preferred_start_time: string | null
          remarks: string | null
          room: string | null
          school_id: string | null
          score: number | null
          seat_no: number | null
          status_id: number
          student_id: string
          subject: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          apply_year?: string | null
          assigned_to?: string | null
          confirmed_date?: string | null
          confirmed_end_time?: string | null
          confirmed_start_time?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_mode_id?: number | null
          duration_minutes?: number | null
          end_time_calculated?: string | null
          exam_type_id: number
          examiner_names?: string | null
          id?: string
          legacy_action?: string | null
          legacy_student_code?: string | null
          legacy_test_type?: string | null
          location?: string | null
          online_link?: string | null
          preferred_date?: string | null
          preferred_start_time?: string | null
          remarks?: string | null
          room?: string | null
          school_id?: string | null
          score?: number | null
          seat_no?: number | null
          status_id?: number
          student_id: string
          subject?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          apply_year?: string | null
          assigned_to?: string | null
          confirmed_date?: string | null
          confirmed_end_time?: string | null
          confirmed_start_time?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_mode_id?: number | null
          duration_minutes?: number | null
          end_time_calculated?: string | null
          exam_type_id?: number
          examiner_names?: string | null
          id?: string
          legacy_action?: string | null
          legacy_student_code?: string | null
          legacy_test_type?: string | null
          location?: string | null
          online_link?: string | null
          preferred_date?: string | null
          preferred_start_time?: string | null
          remarks?: string | null
          room?: string | null
          school_id?: string | null
          score?: number | null
          seat_no?: number | null
          status_id?: number
          student_id?: string
          subject?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_individual_exams_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "student_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_individual_exams_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_individual_exams_delivery_mode_id_fkey"
            columns: ["delivery_mode_id"]
            isOneToOne: false
            referencedRelation: "delivery_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_individual_exams_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "individual_exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_individual_exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_individual_exams_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "exam_booking_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_individual_exams_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_internal_notes: {
        Row: {
          additional_remarks: string | null
          assigned_to: string | null
          character: string | null
          created_at: string | null
          disability_sen: string | null
          guardianship_notes: string | null
          id: string
          medical_notes: string | null
          parent_expectations: string | null
          strategy: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          additional_remarks?: string | null
          assigned_to?: string | null
          character?: string | null
          created_at?: string | null
          disability_sen?: string | null
          guardianship_notes?: string | null
          id?: string
          medical_notes?: string | null
          parent_expectations?: string | null
          strategy?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          additional_remarks?: string | null
          assigned_to?: string | null
          character?: string | null
          created_at?: string | null
          disability_sen?: string | null
          guardianship_notes?: string | null
          id?: string
          medical_notes?: string | null
          parent_expectations?: string | null
          strategy?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_internal_notes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_internal_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_intro_sent_history: {
        Row: {
          brief_intro_id: string
          id: string
          method: string | null
          school_id: string
          sent_at: string | null
          sent_by: string | null
        }
        Insert: {
          brief_intro_id: string
          id?: string
          method?: string | null
          school_id: string
          sent_at?: string | null
          sent_by?: string | null
        }
        Update: {
          brief_intro_id?: string
          id?: string
          method?: string | null
          school_id?: string
          sent_at?: string | null
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_intro_sent_history_brief_intro_id_fkey"
            columns: ["brief_intro_id"]
            isOneToOne: false
            referencedRelation: "student_brief_intro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_intro_sent_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_intro_sent_history_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_log_book: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          legacy_last_update: string | null
          legacy_student_code: string | null
          remarks: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          remarks?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          remarks?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_log_book_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_log_book_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_officers: {
        Row: {
          assigned_to: string | null
          consultant_id: string | null
          created_at: string | null
          id: string
          legacy_consultant_id: string | null
          legacy_last_update: string | null
          legacy_student_code: string | null
          priority: number | null
          remarks: string | null
          role_id: number | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          legacy_consultant_id?: string | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          priority?: number | null
          remarks?: string | null
          role_id?: number | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          consultant_id?: string | null
          created_at?: string | null
          id?: string
          legacy_consultant_id?: string | null
          legacy_last_update?: string | null
          legacy_student_code?: string | null
          priority?: number | null
          remarks?: string | null
          role_id?: number | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_officers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_officers_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_officers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "officer_role_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_officers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_predeparture: {
        Row: {
          airline: string | null
          appointment_date: string | null
          appointment_time: string | null
          arrival_airport: string | null
          arrival_date: string | null
          assigned_to: string | null
          created_at: string | null
          email: string | null
          event_id: string | null
          flight_number: string | null
          id: string
          legacy_event_name: string | null
          legacy_last_update: string | null
          legacy_school_name: string | null
          legacy_student_code: string | null
          others: string | null
          quest: boolean | null
          relatives: string | null
          remarks: string | null
          school_id: string | null
          seats_assigned: number | null
          seats_requested: number | null
          student_id: string
          terminal: string | null
          updated_at: string | null
          whg: boolean | null
        }
        Insert: {
          airline?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          arrival_airport?: string | null
          arrival_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          flight_number?: string | null
          id?: string
          legacy_event_name?: string | null
          legacy_last_update?: string | null
          legacy_school_name?: string | null
          legacy_student_code?: string | null
          others?: string | null
          quest?: boolean | null
          relatives?: string | null
          remarks?: string | null
          school_id?: string | null
          seats_assigned?: number | null
          seats_requested?: number | null
          student_id: string
          terminal?: string | null
          updated_at?: string | null
          whg?: boolean | null
        }
        Update: {
          airline?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          arrival_airport?: string | null
          arrival_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          flight_number?: string | null
          id?: string
          legacy_event_name?: string | null
          legacy_last_update?: string | null
          legacy_school_name?: string | null
          legacy_student_code?: string | null
          others?: string | null
          quest?: boolean | null
          relatives?: string | null
          remarks?: string | null
          school_id?: string | null
          seats_assigned?: number | null
          seats_requested?: number | null
          student_id?: string
          terminal?: string | null
          updated_at?: string | null
          whg?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "student_predeparture_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_predeparture_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_predeparture_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_predeparture_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_resume: {
        Row: {
          assigned_to: string | null
          cat: string | null
          composer: string | null
          created_at: string | null
          event_name: string | null
          exam_school: string | null
          gov: string | null
          id: string
          instrument_id: number | null
          legacy_last_update: string | null
          legacy_resume_type: string | null
          legacy_student_code: string | null
          piece: string | null
          priority: number | null
          qualification: string | null
          remarks: string | null
          result: string | null
          resume_type_id: number | null
          student_id: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          cat?: string | null
          composer?: string | null
          created_at?: string | null
          event_name?: string | null
          exam_school?: string | null
          gov?: string | null
          id?: string
          instrument_id?: number | null
          legacy_last_update?: string | null
          legacy_resume_type?: string | null
          legacy_student_code?: string | null
          piece?: string | null
          priority?: number | null
          qualification?: string | null
          remarks?: string | null
          result?: string | null
          resume_type_id?: number | null
          student_id: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          cat?: string | null
          composer?: string | null
          created_at?: string | null
          event_name?: string | null
          exam_school?: string | null
          gov?: string | null
          id?: string
          instrument_id?: number | null
          legacy_last_update?: string | null
          legacy_resume_type?: string | null
          legacy_student_code?: string | null
          piece?: string | null
          priority?: number | null
          qualification?: string | null
          remarks?: string | null
          result?: string | null
          resume_type_id?: number | null
          student_id?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_resume_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resume_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "music_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resume_resume_type_id_fkey"
            columns: ["resume_type_id"]
            isOneToOne: false
            referencedRelation: "resume_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resume_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_resume_profile: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          english_standard: string | null
          id: string
          interests_hobbies: string | null
          parents_input: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          english_standard?: string | null
          id?: string
          interests_hobbies?: string | null
          parents_input?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          english_standard?: string | null
          id?: string
          interests_hobbies?: string | null
          parents_input?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_resume_profile_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resume_profile_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_resume_talents: {
        Row: {
          assigned_to: string | null
          award_name: string | null
          category: string
          created_at: string | null
          id: string
          instrument_sport: string | null
          results: string | null
          student_id: string
          updated_at: string | null
          video_file_name: string | null
          video_path: string | null
        }
        Insert: {
          assigned_to?: string | null
          award_name?: string | null
          category: string
          created_at?: string | null
          id?: string
          instrument_sport?: string | null
          results?: string | null
          student_id: string
          updated_at?: string | null
          video_file_name?: string | null
          video_path?: string | null
        }
        Update: {
          assigned_to?: string | null
          award_name?: string | null
          category?: string
          created_at?: string | null
          id?: string
          instrument_sport?: string | null
          results?: string | null
          student_id?: string
          updated_at?: string | null
          video_file_name?: string | null
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_resume_talents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resume_talents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      student_visits: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          half_term_holiday: string | null
          id: string
          legacy_last_update: string | null
          legacy_school_name: string | null
          legacy_student_code: string | null
          remarks: string | null
          result_status_id: number | null
          school_contact: string | null
          school_id: string | null
          student_id: string
          updated_at: string | null
          visit_date: string | null
          visit_log: string | null
          visit_time: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          half_term_holiday?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_school_name?: string | null
          legacy_student_code?: string | null
          remarks?: string | null
          result_status_id?: number | null
          school_contact?: string | null
          school_id?: string | null
          student_id: string
          updated_at?: string | null
          visit_date?: string | null
          visit_log?: string | null
          visit_time?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          half_term_holiday?: string | null
          id?: string
          legacy_last_update?: string | null
          legacy_school_name?: string | null
          legacy_student_code?: string | null
          remarks?: string | null
          result_status_id?: number | null
          school_contact?: string | null
          school_id?: string | null
          student_id?: string
          updated_at?: string | null
          visit_date?: string | null
          visit_log?: string | null
          visit_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_visits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_visits_result_status_id_fkey"
            columns: ["result_status_id"]
            isOneToOne: false
            referencedRelation: "visit_result_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_visits_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_visits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          aa_news: boolean | null
          address_line_1: string | null
          airport_pickup: boolean | null
          assigned_to: string | null
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
          lead_source_category: string | null
          lead_source_event_id: string | null
          lead_source_id: number | null
          lead_source_referral_detail: string | null
          legacy_address_line_2: string | null
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
          airport_pickup?: boolean | null
          assigned_to?: string | null
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
          lead_source_category?: string | null
          lead_source_event_id?: string | null
          lead_source_id?: number | null
          lead_source_referral_detail?: string | null
          legacy_address_line_2?: string | null
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
          airport_pickup?: boolean | null
          assigned_to?: string | null
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
          lead_source_category?: string | null
          lead_source_event_id?: string | null
          lead_source_id?: number | null
          lead_source_referral_detail?: string | null
          legacy_address_line_2?: string | null
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
          status_id?: number | null
          student_code?: string | null
          surname?: string
          telephone?: string | null
          temp_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_lead_source_event_id_fkey"
            columns: ["lead_source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      visit_result_statuses: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      refresh_school_current_fee: {
        Args: { target_school_id?: string }
        Returns: undefined
      }
      resolve_permissions: {
        Args: { p_profile_id: string }
        Returns: {
          access: number
          module_key: string
        }[]
      }
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
