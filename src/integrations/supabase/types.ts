export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          tags: string | null
          updated_at: string | null
          userid: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          tags?: string | null
          updated_at?: string | null
          userid: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          tags?: string | null
          updated_at?: string | null
          userid?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_userid_fkey"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lembretes: {
        Row: {
          created_at: string | null
          data: string | null
          descricao: string | null
          icon: string | null
          id: number
          is_recurring: boolean | null
          original_date: string | null
          repeat_months: number | null
          status: string | null
          userid: string
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          icon?: string | null
          id?: never
          is_recurring?: boolean | null
          original_date?: string | null
          repeat_months?: number | null
          status?: string | null
          userid: string
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          icon?: string | null
          id?: never
          is_recurring?: boolean | null
          original_date?: string | null
          repeat_months?: number | null
          status?: string | null
          userid?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_userid_fkey"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assinaturaid: string | null
          ativo: boolean | null
          avatar_url: string | null
          created_at: string | null
          customerid: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          nome: string | null
          phone: string | null
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_id: string | null
          subscription_status: string | null
          updated_at: string | null
          username: string | null
          whatsapp: string | null
        }
        Insert: {
          assinaturaid?: string | null
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          customerid?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          nome?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          whatsapp?: string | null
        }
        Update: {
          assinaturaid?: string | null
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          customerid?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          nome?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          card_brand: string | null
          card_last_four: string | null
          created_at: string | null
          currency: string | null
          cycle: string | null
          id: string
          next_payment_date: string | null
          payment_method: string | null
          plan_name: string | null
          start_date: string | null
          status: string
          subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          currency?: string | null
          cycle?: string | null
          id?: string
          next_payment_date?: string | null
          payment_method?: string | null
          plan_name?: string | null
          start_date?: string | null
          status?: string
          subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          currency?: string | null
          cycle?: string | null
          id?: string
          next_payment_date?: string | null
          payment_method?: string | null
          plan_name?: string | null
          start_date?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_audit: {
        Row: {
          action: string
          created_at: string | null
          id: number
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: never
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: never
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_public: boolean | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: never
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: never
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          category_id: string
          created_at: string | null
          detalhes: string | null
          estabelecimento: string | null
          id: number
          quando: string | null
          tipo: string
          userid: string
          valor: number
        }
        Insert: {
          category_id: string
          created_at?: string | null
          detalhes?: string | null
          estabelecimento?: string | null
          id?: never
          quando?: string | null
          tipo?: string
          userid: string
          valor?: number
        }
        Update: {
          category_id?: string
          created_at?: string | null
          detalhes?: string | null
          estabelecimento?: string | null
          id?: never
          quando?: string | null
          tipo?: string
          userid?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_userid_fkey"
            columns: ["userid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          created_at: string | null
          expense_limit: number | null
          id: string
          income_goal: number | null
          month: number
          updated_at: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          expense_limit?: number | null
          id?: string
          income_goal?: number | null
          month: number
          updated_at?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          expense_limit?: number | null
          id?: string
          income_goal?: number | null
          month?: number
          updated_at?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      user_owns_category: {
        Args: { category_uuid: string }
        Returns: boolean
      }
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
