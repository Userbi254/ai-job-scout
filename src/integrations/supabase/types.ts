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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cv_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_url: string | null
          template_data: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_url?: string | null
          template_data?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_url?: string | null
          template_data?: Json
        }
        Relationships: []
      }
      jobs: {
        Row: {
          amount: string | null
          application_url: string | null
          company: string | null
          created_at: string | null
          deadline: string | null
          employment_details: string[] | null
          id: string
          is_active: boolean | null
          job_name: string
          payment_method: string | null
          relevance_score: number | null
          requirements: string[] | null
          site_url: string | null
          skills_needed: string[] | null
          starting_date: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: string | null
          application_url?: string | null
          company?: string | null
          created_at?: string | null
          deadline?: string | null
          employment_details?: string[] | null
          id?: string
          is_active?: boolean | null
          job_name: string
          payment_method?: string | null
          relevance_score?: number | null
          requirements?: string[] | null
          site_url?: string | null
          skills_needed?: string[] | null
          starting_date?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: string | null
          application_url?: string | null
          company?: string | null
          created_at?: string | null
          deadline?: string | null
          employment_details?: string[] | null
          id?: string
          is_active?: boolean | null
          job_name?: string
          payment_method?: string | null
          relevance_score?: number | null
          requirements?: string[] | null
          site_url?: string | null
          skills_needed?: string[] | null
          starting_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          certifications: string[] | null
          created_at: string | null
          education: Json | null
          email: string | null
          experience: Json | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_url: string | null
          skills: string[] | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string | null
          education?: Json | null
          email?: string | null
          experience?: Json | null
          full_name?: string | null
          id: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          certifications?: string[] | null
          created_at?: string | null
          education?: Json | null
          email?: string | null
          experience?: Json | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_cvs: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          job_id: string | null
          pdf_url: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          job_id?: string | null
          pdf_url?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          job_id?: string | null
          pdf_url?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_cvs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cvs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "cv_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          crawled_pages: Json | null
          deleted_at: string | null
          deleted_from: string | null
          error_message: string | null
          extracted_jobs: Json | null
          id: string
          is_trashed: boolean | null
          location: string | null
          query: string | null
          search_results: Json | null
          sorted_jobs: Json | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          crawled_pages?: Json | null
          deleted_at?: string | null
          deleted_from?: string | null
          error_message?: string | null
          extracted_jobs?: Json | null
          id?: string
          is_trashed?: boolean | null
          location?: string | null
          query?: string | null
          search_results?: Json | null
          sorted_jobs?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          crawled_pages?: Json | null
          deleted_at?: string | null
          deleted_from?: string | null
          error_message?: string | null
          extracted_jobs?: Json | null
          id?: string
          is_trashed?: boolean | null
          location?: string | null
          query?: string | null
          search_results?: Json | null
          sorted_jobs?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
