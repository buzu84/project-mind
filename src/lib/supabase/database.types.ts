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
  public: {
    Tables: {
      ai_usage: {
        Row: {
          completion_tokens: number
          created_at: string
          currency: string
          error_message: string | null
          estimated_cost: number
          feature: string
          id: string
          input_cost: number
          is_mock: boolean
          latency_ms: number | null
          metadata: Json | null
          model: string
          output_cost: number
          project_id: string | null
          prompt_tokens: number
          provider: string
          status: string
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          currency?: string
          error_message?: string | null
          estimated_cost?: number
          feature: string
          id?: string
          input_cost?: number
          is_mock?: boolean
          latency_ms?: number | null
          metadata?: Json | null
          model: string
          output_cost?: number
          project_id?: string | null
          prompt_tokens?: number
          provider?: string
          status?: string
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          currency?: string
          error_message?: string | null
          estimated_cost?: number
          feature?: string
          id?: string
          input_cost?: number
          is_mock?: boolean
          latency_ms?: number | null
          metadata?: Json | null
          model?: string
          output_cost?: number
          project_id?: string | null
          prompt_tokens?: number
          provider?: string
          status?: string
          total_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          created_at: string
          id: string
          input: Json
          output: Json
          project_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          input?: Json
          output?: Json
          project_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          input?: Json
          output?: Json
          project_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          project_id: string
          token_count: number
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          project_id: string
          token_count?: number
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          project_id?: string
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "feedback_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_ideas: {
        Row: {
          ai_commentary: string | null
          confidence: number
          created_at: string
          description: string | null
          effort: number
          ice_score: number
          id: string
          impact: number
          name: string
          priority: number
          project_id: string
          reach: number
          rice_score: number
          scored_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_commentary?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          effort?: number
          ice_score?: number
          id?: string
          impact?: number
          name: string
          priority?: number
          project_id: string
          reach?: number
          rice_score?: number
          scored_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_commentary?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          effort?: number
          ice_score?: number
          id?: string
          impact?: number
          name?: string
          priority?: number
          project_id?: string
          reach?: number
          rice_score?: number
          scored_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_ideas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          source: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          source?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          source?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      global_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          project_id: string
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id: string
          title: string
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_agent_reviews: {
        Row: {
          consensus: Json
          created_at: string
          cto_response: Json
          growth_response: Json
          id: string
          input_type: string
          is_mock: boolean
          model: string | null
          pm_response: Json
          project_id: string
          question: string
          updated_at: string
          ux_response: Json
        }
        Insert: {
          consensus?: Json
          created_at?: string
          cto_response?: Json
          growth_response?: Json
          id?: string
          input_type: string
          is_mock?: boolean
          model?: string | null
          pm_response?: Json
          project_id: string
          question: string
          updated_at?: string
          ux_response?: Json
        }
        Update: {
          consensus?: Json
          created_at?: string
          cto_response?: Json
          growth_response?: Json
          id?: string
          input_type?: string
          is_mock?: boolean
          model?: string | null
          pm_response?: Json
          project_id?: string
          question?: string
          updated_at?: string
          ux_response?: Json
        }
        Relationships: [
          {
            foreignKeyName: "multi_agent_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assumptions: {
        Row: {
          assumption_type: string
          created_at: string
          decision_id: string | null
          evidence_status: string | null
          generated_by: string | null
          id: string
          project_id: string
          result: string | null
          risk_level: string
          statement: string
          status: string
          type: string | null
          updated_at: string
          user_id: string
          validation_method: string | null
        }
        Insert: {
          assumption_type: string
          created_at?: string
          decision_id?: string | null
          evidence_status?: string | null
          generated_by?: string | null
          id?: string
          project_id: string
          result?: string | null
          risk_level?: string
          statement: string
          status?: string
          type?: string | null
          updated_at?: string
          user_id: string
          validation_method?: string | null
        }
        Update: {
          assumption_type?: string
          created_at?: string
          decision_id?: string | null
          evidence_status?: string | null
          generated_by?: string | null
          id?: string
          project_id?: string
          result?: string | null
          risk_level?: string
          statement?: string
          status?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          validation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_assumptions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "product_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assumptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_decision_agent_reviews: {
        Row: {
          agent_role: string
          concerns: Json | null
          confidence: number | null
          created_at: string
          decision_id: string
          id: string
          project_id: string
          reasoning: string
          suggestions: Json | null
          user_id: string
          verdict: string
        }
        Insert: {
          agent_role: string
          concerns?: Json | null
          confidence?: number | null
          created_at?: string
          decision_id: string
          id?: string
          project_id: string
          reasoning: string
          suggestions?: Json | null
          user_id: string
          verdict: string
        }
        Update: {
          agent_role?: string
          concerns?: Json | null
          confidence?: number | null
          created_at?: string
          decision_id?: string
          id?: string
          project_id?: string
          reasoning?: string
          suggestions?: Json | null
          user_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_decision_agent_reviews_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "product_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_decision_agent_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_decision_evidence_links: {
        Row: {
          created_at: string
          decision_id: string
          evidence_id: string
          id: string
          link_type: string
          notes: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision_id: string
          evidence_id: string
          id?: string
          link_type?: string
          notes?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision_id?: string
          evidence_id?: string
          id?: string
          link_type?: string
          notes?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_decision_evidence_links_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "product_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_decision_evidence_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "product_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_decision_evidence_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_decision_options: {
        Row: {
          confidence_score: number | null
          cons: Json | null
          created_at: string
          decision_id: string
          description: string | null
          effort_estimate: string | null
          expected_impact: string | null
          generated_by: string | null
          id: string
          project_id: string
          pros: Json | null
          reversibility: string | null
          risk_level: string | null
          risks: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          cons?: Json | null
          created_at?: string
          decision_id: string
          description?: string | null
          effort_estimate?: string | null
          expected_impact?: string | null
          generated_by?: string | null
          id?: string
          project_id: string
          pros?: Json | null
          reversibility?: string | null
          risk_level?: string | null
          risks?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          cons?: Json | null
          created_at?: string
          decision_id?: string
          description?: string | null
          effort_estimate?: string | null
          expected_impact?: string | null
          generated_by?: string | null
          id?: string
          project_id?: string
          pros?: Json | null
          reversibility?: string | null
          risk_level?: string | null
          risks?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_decision_options_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "product_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_decision_options_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_decision_recommendations: {
        Row: {
          alternatives: Json | null
          assumptions: Json | null
          confidence_score: number | null
          created_at: string
          decision_id: string
          generated_by: string | null
          id: string
          next_steps: Json | null
          next_validation_steps: Json | null
          project_id: string
          reasoning: string | null
          recommendation: string | null
          recommended_option_id: string | null
          risk_assessment: string | null
          risks: Json | null
          summary: string | null
          supporting_evidence: Json | null
          user_id: string
        }
        Insert: {
          alternatives?: Json | null
          assumptions?: Json | null
          confidence_score?: number | null
          created_at?: string
          decision_id: string
          generated_by?: string | null
          id?: string
          next_steps?: Json | null
          next_validation_steps?: Json | null
          project_id: string
          reasoning?: string | null
          recommendation?: string | null
          recommended_option_id?: string | null
          risk_assessment?: string | null
          risks?: Json | null
          summary?: string | null
          supporting_evidence?: Json | null
          user_id: string
        }
        Update: {
          alternatives?: Json | null
          assumptions?: Json | null
          confidence_score?: number | null
          created_at?: string
          decision_id?: string
          generated_by?: string | null
          id?: string
          next_steps?: Json | null
          next_validation_steps?: Json | null
          project_id?: string
          reasoning?: string | null
          recommendation?: string | null
          recommended_option_id?: string | null
          risk_assessment?: string | null
          risks?: Json | null
          summary?: string | null
          supporting_evidence?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_decision_recommendations_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "product_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_decision_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_decision_recommendations_recommended_option_id_fkey"
            columns: ["recommended_option_id"]
            isOneToOne: false
            referencedRelation: "product_decision_options"
            referencedColumns: ["id"]
          },
        ]
      }
      product_decisions: {
        Row: {
          category: string
          confidence_score: number | null
          context_summary: string | null
          created_at: string
          deadline: string | null
          effort_estimate: string | null
          id: string
          problem_statement: string | null
          project_id: string
          reversibility: string | null
          selected_option_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          confidence_score?: number | null
          context_summary?: string | null
          created_at?: string
          deadline?: string | null
          effort_estimate?: string | null
          id?: string
          problem_statement?: string | null
          project_id: string
          reversibility?: string | null
          selected_option_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          confidence_score?: number | null
          context_summary?: string | null
          created_at?: string
          deadline?: string | null
          effort_estimate?: string | null
          id?: string
          problem_statement?: string | null
          project_id?: string
          reversibility?: string | null
          selected_option_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_selected_option"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "product_decision_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_evidence: {
        Row: {
          claim: string | null
          content: string | null
          created_at: string
          generated_by: string | null
          id: string
          project_id: string
          relevance_score: number | null
          source_id: string | null
          source_type: string
          source_url: string | null
          status: string
          tags: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          claim?: string | null
          content?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          project_id: string
          relevance_score?: number | null
          source_id?: string | null
          source_type: string
          source_url?: string | null
          status?: string
          tags?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          claim?: string | null
          content?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          project_id?: string
          relevance_score?: number | null
          source_id?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          tags?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_evidence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_context: {
        Row: {
          competitors: string | null
          constraints: string | null
          created_at: string
          current_metrics: string | null
          id: string
          open_questions: string | null
          pain_points: string | null
          product_overview: string | null
          project_id: string
          strategic_goals: string | null
          target_personas: string | null
          updated_at: string
        }
        Insert: {
          competitors?: string | null
          constraints?: string | null
          created_at?: string
          current_metrics?: string | null
          id?: string
          open_questions?: string | null
          pain_points?: string | null
          product_overview?: string | null
          project_id: string
          strategic_goals?: string | null
          target_personas?: string | null
          updated_at?: string
        }
        Update: {
          competitors?: string | null
          constraints?: string | null
          created_at?: string
          current_metrics?: string | null
          id?: string
          open_questions?: string | null
          pain_points?: string | null
          product_overview?: string | null
          project_id?: string
          strategic_goals?: string | null
          target_personas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_context_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          business_model: string | null
          created_at: string
          description: string | null
          goals: string | null
          id: string
          market: string | null
          name: string
          target_users: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_model?: string | null
          created_at?: string
          description?: string | null
          goals?: string | null
          id?: string
          market?: string | null
          name: string
          target_users?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_model?: string | null
          created_at?: string
          description?: string | null
          goals?: string | null
          id?: string
          market?: string | null
          name?: string
          target_users?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmaps: {
        Row: {
          created_at: string
          dependencies: Json
          id: string
          is_mock: boolean
          later_items: Json
          next_items: Json
          now_items: Json
          plan_30_days: Json
          plan_60_days: Json
          plan_90_days: Json
          project_id: string
          risks: Json
          success_metrics: Json
          title: string
        }
        Insert: {
          created_at?: string
          dependencies?: Json
          id?: string
          is_mock?: boolean
          later_items?: Json
          next_items?: Json
          now_items?: Json
          plan_30_days?: Json
          plan_60_days?: Json
          plan_90_days?: Json
          project_id: string
          risks?: Json
          success_metrics?: Json
          title?: string
        }
        Update: {
          created_at?: string
          dependencies?: Json
          id?: string
          is_mock?: boolean
          later_items?: Json
          next_items?: Json
          now_items?: Json
          plan_30_days?: Json
          plan_60_days?: Json
          plan_90_days?: Json
          project_id?: string
          risks?: Json
          success_metrics?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmaps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_document_chunks: {
        Args: {
          match_count?: number
          match_project_id: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          project_id: string
          similarity: number
        }[]
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
