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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          last_used_at: string | null
          provider_id: string
          usage_count: number
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
          provider_id: string
          usage_count?: number
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
          provider_id?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_api_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          base_url: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_default: boolean
          models: Json
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          models?: Json
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          models?: Json
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          generation_count: number
          id: string
          usage_date: string
          user_id: string
        }
        Insert: {
          generation_count?: number
          id?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          generation_count?: number
          id?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      developer_settings: {
        Row: {
          avatar_url: string | null
          bio: string | null
          email: string | null
          github_url: string | null
          id: string
          name: string
          twitter_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          email?: string | null
          github_url?: string | null
          id?: string
          name?: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          email?: string | null
          github_url?: string | null
          id?: string
          name?: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          plan_id: string | null
          screenshot_url: string | null
          sender_number: string
          status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          plan_id?: string | null
          screenshot_url?: string | null
          sender_number: string
          status?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          plan_id?: string | null
          screenshot_url?: string | null
          sender_number?: string
          status?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          plan: string
          plan_expires_at: string | null
          plan_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          duration_days: number
          features: string[]
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days: number
          features?: string[]
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          features?: string[]
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          prompt_text: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          prompt_text: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          prompt_text?: string
          sort_order?: number
          updated_at?: string
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
      websites: {
        Row: {
          category: string | null
          created_at: string
          css_content: string | null
          deployed_url: string | null
          description: string | null
          html_content: string | null
          id: string
          js_content: string | null
          name: string
          preview_data: Json | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          css_content?: string | null
          deployed_url?: string | null
          description?: string | null
          html_content?: string | null
          id?: string
          js_content?: string | null
          name: string
          preview_data?: Json | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          css_content?: string | null
          deployed_url?: string | null
          description?: string | null
          html_content?: string | null
          id?: string
          js_content?: string | null
          name?: string
          preview_data?: Json | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
