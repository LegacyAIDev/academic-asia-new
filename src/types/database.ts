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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
          boarder_age_range: string | null
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
          boarder_age_range?: string | null
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
          boarder_age_range?: string | null
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
          address_line_2: string | null
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
          entry_year: string | null
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
          address_line_2?: string | null
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
          entry_year?: string | null
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
          address_line_2?: string | null
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
          entry_year?: string | null
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
