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
    PostgrestVersion: "14.5"
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
      ai_runs: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"] | null
          confidence: number | null
          conversation_id: string | null
          created_at: string
          decision: Database["public"]["Enums"]["ai_decision"] | null
          detected_language: string | null
          error_message: string | null
          id: string
          incoming_message: string
          intent: Database["public"]["Enums"]["intent_type"] | null
          is_test: boolean
          knowledge_ids: string[]
          knowledge_refs: Json
          latency_ms: number | null
          model: string | null
          reply: string | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["channel_type"] | null
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["ai_decision"] | null
          detected_language?: string | null
          error_message?: string | null
          id?: string
          incoming_message?: string
          intent?: Database["public"]["Enums"]["intent_type"] | null
          is_test?: boolean
          knowledge_ids?: string[]
          knowledge_refs?: Json
          latency_ms?: number | null
          model?: string | null
          reply?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"] | null
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["ai_decision"] | null
          detected_language?: string | null
          error_message?: string | null
          id?: string
          incoming_message?: string
          intent?: Database["public"]["Enums"]["intent_type"] | null
          is_test?: boolean
          knowledge_ids?: string[]
          knowledge_refs?: Json
          latency_ms?: number | null
          model?: string | null
          reply?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          allow_price_quotes: boolean
          assistant_name: string
          auto_reply_enabled: boolean
          business_rules: string
          context_message_limit: number
          created_at: string
          fallback_message: string
          greeting: string
          handoff_keywords: string[]
          handoff_rules: string
          id: string
          language: string
          max_reply_chars: number
          model: string
          temperature: number
          tone: string
          updated_at: string
        }
        Insert: {
          allow_price_quotes?: boolean
          assistant_name?: string
          auto_reply_enabled?: boolean
          business_rules?: string
          context_message_limit?: number
          created_at?: string
          fallback_message?: string
          greeting?: string
          handoff_keywords?: string[]
          handoff_rules?: string
          id?: string
          language?: string
          max_reply_chars?: number
          model?: string
          temperature?: number
          tone?: string
          updated_at?: string
        }
        Update: {
          allow_price_quotes?: boolean
          assistant_name?: string
          auto_reply_enabled?: boolean
          business_rules?: string
          context_message_limit?: number
          created_at?: string
          fallback_message?: string
          greeting?: string
          handoff_keywords?: string[]
          handoff_rules?: string
          id?: string
          language?: string
          max_reply_chars?: number
          model?: string
          temperature?: number
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          business_name: string
          created_at: string
          id: string
          instagram_connected: boolean
          meta_connected: boolean
          openai_connected: boolean
          support_email: string
          support_phone: string
          timezone: string
          updated_at: string
          website: string
        }
        Insert: {
          business_name?: string
          created_at?: string
          id?: string
          instagram_connected?: boolean
          meta_connected?: boolean
          openai_connected?: boolean
          support_email?: string
          support_phone?: string
          timezone?: string
          updated_at?: string
          website?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          instagram_connected?: boolean
          meta_connected?: boolean
          openai_connected?: boolean
          support_email?: string
          support_phone?: string
          timezone?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ai_enabled: boolean
          channel: Database["public"]["Enums"]["channel_type"]
          created_at: string
          customer_id: string
          external_conversation_id: string | null
          handled_by: Database["public"]["Enums"]["handler_type"]
          handoff_state: Database["public"]["Enums"]["handoff_state"]
          id: string
          is_test: boolean
          language: string
          last_confidence: number | null
          last_intent: Database["public"]["Enums"]["intent_type"] | null
          last_message_at: string
          metadata: Json
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string | null
          summary: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          customer_id: string
          external_conversation_id?: string | null
          handled_by?: Database["public"]["Enums"]["handler_type"]
          handoff_state?: Database["public"]["Enums"]["handoff_state"]
          id?: string
          is_test?: boolean
          language?: string
          last_confidence?: number | null
          last_intent?: Database["public"]["Enums"]["intent_type"] | null
          last_message_at?: string
          metadata?: Json
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          summary?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          customer_id?: string
          external_conversation_id?: string | null
          handled_by?: Database["public"]["Enums"]["handler_type"]
          handoff_state?: Database["public"]["Enums"]["handoff_state"]
          id?: string
          is_test?: boolean
          language?: string
          last_confidence?: number | null
          last_intent?: Database["public"]["Enums"]["intent_type"] | null
          last_message_at?: string
          metadata?: Json
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          summary?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          avatar_url: string | null
          channel: Database["public"]["Enums"]["channel_type"]
          created_at: string
          email: string | null
          external_id: string | null
          full_name: string
          id: string
          locale: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          email?: string | null
          external_id?: string | null
          full_name: string
          id?: string
          locale?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          email?: string | null
          external_id?: string | null
          full_name?: string
          id?: string
          locale?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_entries: {
        Row: {
          category: Database["public"]["Enums"]["kb_category"]
          content: string
          created_at: string
          embedding_status: string
          id: string
          is_active: boolean
          keywords: string[]
          policy_type: Database["public"]["Enums"]["policy_type"] | null
          priority: number
          service_id: string | null
          sort_order: number
          source_url: string | null
          summary: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["kb_category"]
          content: string
          created_at?: string
          embedding_status?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          policy_type?: Database["public"]["Enums"]["policy_type"] | null
          priority?: number
          service_id?: string | null
          sort_order?: number
          source_url?: string | null
          summary?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["kb_category"]
          content?: string
          created_at?: string
          embedding_status?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          policy_type?: Database["public"]["Enums"]["policy_type"] | null
          priority?: number
          service_id?: string | null
          sort_order?: number
          source_url?: string | null
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget: string | null
          business_type: string | null
          company: string | null
          confidence: number | null
          conversation_id: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          preferred_contact: string | null
          requested_service: string | null
          requirements: string | null
          service_id: string | null
          source_channel: Database["public"]["Enums"]["channel_type"] | null
          status: Database["public"]["Enums"]["lead_status"]
          timeline: string | null
          updated_at: string
        }
        Insert: {
          budget?: string | null
          business_type?: string | null
          company?: string | null
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_contact?: string | null
          requested_service?: string | null
          requirements?: string | null
          service_id?: string | null
          source_channel?: Database["public"]["Enums"]["channel_type"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          budget?: string | null
          business_type?: string | null
          company?: string | null
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_contact?: string | null
          requested_service?: string | null
          requirements?: string | null
          service_id?: string | null
          source_channel?: Database["public"]["Enums"]["channel_type"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          external_message_id: string | null
          id: string
          intent: Database["public"]["Enums"]["intent_type"] | null
          latency_ms: number | null
          metadata: Json
          model: string | null
          sender: Database["public"]["Enums"]["sender_type"]
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["intent_type"] | null
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          sender: Database["public"]["Enums"]["sender_type"]
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["intent_type"] | null
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          sender?: Database["public"]["Enums"]["sender_type"]
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      response_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          name: string
          sort_order: number
          template_type: Database["public"]["Enums"]["template_type"]
          tone: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name: string
          sort_order?: number
          template_type: Database["public"]["Enums"]["template_type"]
          tone?: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          sort_order?: number
          template_type?: Database["public"]["Enums"]["template_type"]
          tone?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      service_packages: {
        Row: {
          ai_notes: string
          created_at: string
          currency: string
          description: string
          features: string[]
          id: string
          is_active: boolean
          limitations: string[]
          name: string
          price: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          service_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          ai_notes?: string
          created_at?: string
          currency?: string
          description?: string
          features?: string[]
          id?: string
          is_active?: boolean
          limitations?: string[]
          name: string
          price?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          service_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ai_notes?: string
          created_at?: string
          currency?: string
          description?: string
          features?: string[]
          id?: string
          is_active?: boolean
          limitations?: string[]
          name?: string
          price?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          service_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          ai_visible: boolean
          created_at: string
          currency: string
          delivery_time: string | null
          description: string | null
          excludes: string[]
          features: string[]
          id: string
          includes: string[]
          is_active: boolean
          name: string
          price_range: string | null
          short_description: string
          sort_order: number
          starting_price: number | null
          updated_at: string
        }
        Insert: {
          ai_visible?: boolean
          created_at?: string
          currency?: string
          delivery_time?: string | null
          description?: string | null
          excludes?: string[]
          features?: string[]
          id?: string
          includes?: string[]
          is_active?: boolean
          name: string
          price_range?: string | null
          short_description?: string
          sort_order?: number
          starting_price?: number | null
          updated_at?: string
        }
        Update: {
          ai_visible?: boolean
          created_at?: string
          currency?: string
          delivery_time?: string | null
          description?: string | null
          excludes?: string[]
          features?: string[]
          id?: string
          includes?: string[]
          is_active?: boolean
          name?: string
          price_range?: string | null
          short_description?: string
          sort_order?: number
          starting_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_knowledge: {
        Args: {
          filter_category?: Database["public"]["Enums"]["kb_category"]
          match_limit?: number
          search_query: string
        }
        Returns: {
          category: Database["public"]["Enums"]["kb_category"]
          content: string
          id: string
          keywords: string[]
          policy_type: Database["public"]["Enums"]["policy_type"]
          priority: number
          score: number
          service_id: string
          summary: string
          tags: string[]
          title: string
        }[]
      }
    }
    Enums: {
      ai_decision: "answer" | "clarify" | "collect_lead" | "handoff" | "ignore"
      channel_type: "messenger" | "instagram" | "web"
      conversation_status: "active" | "pending" | "closed"
      handler_type: "ai" | "human"
      handoff_state: "none" | "human_required" | "human_active" | "resolved"
      intent_type:
        | "greeting"
        | "website_development"
        | "ecommerce"
        | "advertising"
        | "branding_design"
        | "digital_marketing"
        | "pricing"
        | "portfolio"
        | "hosting_domain"
        | "support"
        | "general_question"
        | "human_handoff"
        | "unknown"
        | "dentist_product"
        | "dentist_appointment"
        | "dentist_patient_management"
        | "wishhub"
        | "wishhub_card"
        | "wishhub_scheduling"
        | "wishhub_event"
        | "vingobd"
        | "vingobd_card_design"
        | "vingobd_bangladeshi_event"
        | "digital_product_general"
      kb_category:
        | "company"
        | "service"
        | "pricing"
        | "faq"
        | "policy"
        | "ai_instruction"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal"
        | "won"
        | "lost"
      policy_type:
        | "payment"
        | "refund"
        | "revision"
        | "delivery"
        | "support"
        | "cancellation"
        | "general"
      pricing_type: "one_time" | "monthly" | "yearly" | "hourly" | "custom"
      sender_type: "customer" | "ai" | "agent" | "system"
      template_type:
        | "greeting"
        | "website_inquiry"
        | "advertising_inquiry"
        | "pricing_inquiry"
        | "general_inquiry"
        | "human_handoff"
        | "thank_you"
        | "follow_up"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {
      ai_decision: ["answer", "clarify", "collect_lead", "handoff", "ignore"],
      channel_type: ["messenger", "instagram", "web"],
      conversation_status: ["active", "pending", "closed"],
      handler_type: ["ai", "human"],
      handoff_state: ["none", "human_required", "human_active", "resolved"],
      intent_type: [
        "greeting",
        "website_development",
        "ecommerce",
        "advertising",
        "branding_design",
        "digital_marketing",
        "pricing",
        "portfolio",
        "hosting_domain",
        "support",
        "general_question",
        "human_handoff",
        "unknown",
        "dentist_product",
        "dentist_appointment",
        "dentist_patient_management",
        "wishhub",
        "wishhub_card",
        "wishhub_scheduling",
        "wishhub_event",
        "vingobd",
        "vingobd_card_design",
        "vingobd_bangladeshi_event",
        "digital_product_general",
      ],
      kb_category: [
        "company",
        "service",
        "pricing",
        "faq",
        "policy",
        "ai_instruction",
      ],
      lead_status: ["new", "contacted", "qualified", "proposal", "won", "lost"],
      policy_type: [
        "payment",
        "refund",
        "revision",
        "delivery",
        "support",
        "cancellation",
        "general",
      ],
      pricing_type: ["one_time", "monthly", "yearly", "hourly", "custom"],
      sender_type: ["customer", "ai", "agent", "system"],
      template_type: [
        "greeting",
        "website_inquiry",
        "advertising_inquiry",
        "pricing_inquiry",
        "general_inquiry",
        "human_handoff",
        "thank_you",
        "follow_up",
      ],
    },
  },
} as const
