export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          target_users: string | null;
          market: string | null;
          business_model: string | null;
          goals: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          target_users?: string | null;
          market?: string | null;
          business_model?: string | null;
          goals?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          target_users?: string | null;
          market?: string | null;
          business_model?: string | null;
          goals?: string | null;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          project_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      feedback_documents: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          content: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          content: string;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          source?: string | null;
        };
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          project_id: string;
          content: string;
          embedding: string | null;
          token_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          project_id: string;
          content: string;
          embedding?: string | null;
          token_count?: number;
          created_at?: string;
        };
        Update: {
          content?: string;
          embedding?: string | null;
          token_count?: number;
        };
      };
      insights: {
        Row: {
          id: string;
          project_id: string;
          type: string;
          title: string;
          content: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: string;
          title: string;
          content: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          type?: string;
          title?: string;
          content?: string;
          metadata?: Json | null;
        };
      };
      feature_ideas: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          priority: number;
          effort: number;
          impact: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          priority?: number;
          effort?: number;
          impact?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          priority?: number;
          effort?: number;
          impact?: number;
          status?: string;
          updated_at?: string;
        };
      };
      project_context: {
        Row: {
          id: string;
          project_id: string;
          product_overview: string | null;
          target_personas: string | null;
          current_metrics: string | null;
          pain_points: string | null;
          competitors: string | null;
          strategic_goals: string | null;
          constraints: string | null;
          open_questions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          product_overview?: string | null;
          target_personas?: string | null;
          current_metrics?: string | null;
          pain_points?: string | null;
          competitors?: string | null;
          strategic_goals?: string | null;
          constraints?: string | null;
          open_questions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          product_overview?: string | null;
          target_personas?: string | null;
          current_metrics?: string | null;
          pain_points?: string | null;
          competitors?: string | null;
          strategic_goals?: string | null;
          constraints?: string | null;
          open_questions?: string | null;
          updated_at?: string;
        };
      };
      decisions: {
        Row: {
          id: string;
          project_id: string;
          type: "PRD" | "PRIORITIZATION" | "COMPETITIVE_ANALYSIS";
          input: Json;
          output: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: "PRD" | "PRIORITIZATION" | "COMPETITIVE_ANALYSIS";
          input: Json;
          output: Json;
          created_at?: string;
        };
        Update: {
          input?: Json;
          output?: Json;
        };
      };
      ai_usage: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          provider: string;
          model: string;
          feature: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          input_cost: number;
          output_cost: number;
          estimated_cost: number;
          currency: string;
          is_mock: boolean;
          status: "success" | "error" | "skipped";
          error_message: string | null;
          latency_ms: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          provider?: string;
          model: string;
          feature: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          input_cost?: number;
          output_cost?: number;
          estimated_cost?: number;
          currency?: string;
          is_mock?: boolean;
          status?: "success" | "error" | "skipped";
          error_message?: string | null;
          latency_ms?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          status?: "success" | "error" | "skipped";
          error_message?: string | null;
          metadata?: Json | null;
        };
      };
    };
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

