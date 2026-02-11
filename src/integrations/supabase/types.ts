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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          image_url: string | null
          is_admin: boolean | null
          is_pinned: boolean | null
          read_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          image_url?: string | null
          is_admin?: boolean | null
          is_pinned?: boolean | null
          read_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          image_url?: string | null
          is_admin?: boolean | null
          is_pinned?: boolean | null
          read_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          bucket_name: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          bucket_name: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          bucket_name?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      driver_absent_fines: {
        Row: {
          created_at: string
          days: number
          driver_id: string
          driver_reason: string | null
          end_date: string
          entered_by: string
          fine_no: string
          fine_type: string
          id: string
          start_date: string
          timestamp: string
          total_amount: number
          uploaded_by: string
          vehicle_number: string
        }
        Insert: {
          created_at?: string
          days?: number
          driver_id: string
          driver_reason?: string | null
          end_date: string
          entered_by: string
          fine_no: string
          fine_type: string
          id?: string
          start_date: string
          timestamp?: string
          total_amount?: number
          uploaded_by: string
          vehicle_number: string
        }
        Update: {
          created_at?: string
          days?: number
          driver_id?: string
          driver_reason?: string | null
          end_date?: string
          entered_by?: string
          fine_no?: string
          fine_type?: string
          id?: string
          start_date?: string
          timestamp?: string
          total_amount?: number
          uploaded_by?: string
          vehicle_number?: string
        }
        Relationships: []
      }
      driver_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          driver_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          driver_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          driver_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      driver_credentials: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      driver_income: {
        Row: {
          average_daily_income: number | null
          created_at: string
          driver_id: string
          driver_name: string | null
          id: string
          month: string
          shift: string | null
          total_income: number
          total_trips: number | null
          uploaded_by: string
          working_days: number
          year: number
        }
        Insert: {
          average_daily_income?: number | null
          created_at?: string
          driver_id: string
          driver_name?: string | null
          id?: string
          month: string
          shift?: string | null
          total_income: number
          total_trips?: number | null
          uploaded_by: string
          working_days: number
          year: number
        }
        Update: {
          average_daily_income?: number | null
          created_at?: string
          driver_id?: string
          driver_name?: string | null
          id?: string
          month?: string
          shift?: string | null
          total_income?: number
          total_trips?: number | null
          uploaded_by?: string
          working_days?: number
          year?: number
        }
        Relationships: []
      }
      driver_income_settings: {
        Row: {
          id: string
          report_heading: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          id?: string
          report_heading?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          id?: string
          report_heading?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      driver_master_file: {
        Row: {
          controller: string | null
          created_at: string
          driver_id: string
          driver_name: string
          id: string
          uploaded_by: string
        }
        Insert: {
          controller?: string | null
          created_at?: string
          driver_id: string
          driver_name: string
          id?: string
          uploaded_by: string
        }
        Update: {
          controller?: string | null
          created_at?: string
          driver_id?: string
          driver_name?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      driver_portal_settings: {
        Row: {
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      driver_request_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      driver_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string
          driver_id: string
          driver_name: string | null
          id: string
          request_no: string | null
          request_type: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description: string
          driver_id: string
          driver_name?: string | null
          id?: string
          request_no?: string | null
          request_type: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string
          driver_id?: string
          driver_name?: string | null
          id?: string
          request_no?: string | null
          request_type?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          driver_id: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          driver_id?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          driver_id?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      target_trips: {
        Row: {
          completed_trips: number
          created_at: string
          driver_id: string
          driver_name: string | null
          id: string
          month: string
          shift: string | null
          target_trips: number
          uploaded_by: string
          year: number
        }
        Insert: {
          completed_trips?: number
          created_at?: string
          driver_id: string
          driver_name?: string | null
          id?: string
          month: string
          shift?: string | null
          target_trips?: number
          uploaded_by: string
          year: number
        }
        Update: {
          completed_trips?: number
          created_at?: string
          driver_id?: string
          driver_name?: string | null
          id?: string
          month?: string
          shift?: string | null
          target_trips?: number
          uploaded_by?: string
          year?: number
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          category: string
          file_path: string
          file_type: string
          id: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          category: string
          file_path: string
          file_type: string
          id?: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          category?: string
          file_path?: string
          file_type?: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warning_letters: {
        Row: {
          action_taken: string
          created_at: string
          date: string
          document_no: string | null
          driver_id: string
          id: string
          name: string | null
          reasons: string | null
          taxi_no: string | null
          uploaded_by: string
        }
        Insert: {
          action_taken?: string
          created_at?: string
          date: string
          document_no?: string | null
          driver_id: string
          id?: string
          name?: string | null
          reasons?: string | null
          taxi_no?: string | null
          uploaded_by: string
        }
        Update: {
          action_taken?: string
          created_at?: string
          date?: string
          document_no?: string | null
          driver_id?: string
          id?: string
          name?: string | null
          reasons?: string | null
          taxi_no?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_approved_day_off_requests: {
        Args: { p_date_str: string }
        Returns: number
      }
      create_driver_account: {
        Args: { p_driver_id: string; p_email: string; p_password: string }
        Returns: string
      }
      create_users_bulk: { Args: { user_data: Json }; Returns: undefined }
      get_driver_credentials: {
        Args: { p_driver_id: string; p_user_id: string }
        Returns: {
          driver_id: string
          id: string
          status: string
          user_id: string
        }[]
      }
      get_my_username: { Args: never; Returns: string }
      has_admin_role: { Args: { user_id: string }; Returns: boolean }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: { role_name: Database["public"]["Enums"]["app_role"] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.has_role(role_name => text), public.has_role(role_name => app_role). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { role_name: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.has_role(role_name => text), public.has_role(role_name => app_role). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      is_guest_account: { Args: { email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "driver" | "advanced"
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
    Enums: {
      app_role: ["admin", "user", "driver", "advanced"],
    },
  },
} as const
