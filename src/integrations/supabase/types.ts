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
      creatives: {
        Row: {
          ad_archive_id: string | null
          body_text: string | null
          captured_at: string
          creative_hash: string | null
          duplicate_count: number
          id: string
          library_id: string | null
          media_type: string | null
          preview_url: string | null
          snapshot_id: string | null
        }
        Insert: {
          ad_archive_id?: string | null
          body_text?: string | null
          captured_at?: string
          creative_hash?: string | null
          duplicate_count?: number
          id?: string
          library_id?: string | null
          media_type?: string | null
          preview_url?: string | null
          snapshot_id?: string | null
        }
        Update: {
          ad_archive_id?: string | null
          body_text?: string | null
          captured_at?: string
          creative_hash?: string | null
          duplicate_count?: number
          id?: string
          library_id?: string | null
          media_type?: string | null
          preview_url?: string | null
          snapshot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creatives_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "library_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creatives_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "library_latest"
            referencedColumns: ["latest_snapshot_id"]
          },
          {
            foreignKeyName: "creatives_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      libraries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          language: string | null
          niche: string | null
          notes: string | null
          page_name: string | null
          search_term: string | null
          status: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string | null
          niche?: string | null
          notes?: string | null
          page_name?: string | null
          search_term?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string | null
          niche?: string | null
          notes?: string | null
          page_name?: string | null
          search_term?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      niches: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          active_ads_count: number
          captured_at: string
          error_message: string | null
          id: string
          library_id: string | null
          scrape_ok: boolean
          top_creative_count: number | null
          top_creative_id: string | null
          top_creative_url: string | null
          total_results_text: string | null
          unique_creatives: number | null
        }
        Insert: {
          active_ads_count?: number
          captured_at?: string
          error_message?: string | null
          id?: string
          library_id?: string | null
          scrape_ok?: boolean
          top_creative_count?: number | null
          top_creative_id?: string | null
          top_creative_url?: string | null
          total_results_text?: string | null
          unique_creatives?: number | null
        }
        Update: {
          active_ads_count?: number
          captured_at?: string
          error_message?: string | null
          id?: string
          library_id?: string | null
          scrape_ok?: boolean
          top_creative_count?: number | null
          top_creative_id?: string | null
          top_creative_url?: string | null
          total_results_text?: string | null
          unique_creatives?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshots_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "library_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_library_stats: {
        Row: {
          avg_active_ads: number | null
          day: string | null
          library_id: string | null
          max_active_ads: number | null
          max_top_creative_count: number | null
          min_active_ads: number | null
          snapshots_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshots_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "library_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      library_latest: {
        Row: {
          active_ads_count: number | null
          captured_at: string | null
          created_at: string | null
          error_message: string | null
          id: string | null
          language: string | null
          last_captured_at: string | null
          latest_snapshot_id: string | null
          niche: string | null
          notes: string | null
          page_name: string | null
          scrape_ok: boolean | null
          search_term: string | null
          status: string | null
          top_creative_count: number | null
          top_creative_id: string | null
          top_creative_url: string | null
          total_results_text: string | null
          unique_creatives: number | null
          updated_at: string | null
          url: string | null
        }
        Relationships: []
      }
      library_trend: {
        Row: {
          captured_at: string | null
          current_active_ads: number | null
          delta: number | null
          delta_pct: number | null
          library_id: string | null
          previous_active_ads: number | null
          trend_direction: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshots_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "library_latest"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purge_old_snapshots: { Args: { days?: number }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
