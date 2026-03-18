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
      agents: {
        Row: {
          address: string
          agent_id: string | null
          agent_uri: string | null
          created_at: string | null
          id: string
          ipfs_fetch_failed: boolean
          is_active: boolean
          name: string
          profile_cid: string
          registered_at: string
          reputation: number
          skills: string[] | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          agent_uri?: string | null
          created_at?: string | null
          id?: string
          ipfs_fetch_failed?: boolean
          is_active?: boolean
          name: string
          profile_cid: string
          registered_at: string
          reputation?: number
          skills?: string[] | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          agent_uri?: string | null
          created_at?: string | null
          id?: string
          ipfs_fetch_failed?: boolean
          is_active?: boolean
          name?: string
          profile_cid?: string
          registered_at?: string
          reputation?: number
          skills?: string[] | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      archived_dispute_votes: {
        Row: {
          created_at: string | null
          dispute_id: string | null
          id: string | null
          supports_disputer: boolean | null
          tx_hash: string | null
          vote_weight: string | null
          voted_at: string | null
          voter_address: string | null
        }
        Insert: {
          created_at?: string | null
          dispute_id?: string | null
          id?: string | null
          supports_disputer?: boolean | null
          tx_hash?: string | null
          vote_weight?: string | null
          voted_at?: string | null
          voter_address?: string | null
        }
        Update: {
          created_at?: string | null
          dispute_id?: string | null
          id?: string | null
          supports_disputer?: boolean | null
          tx_hash?: string | null
          vote_weight?: string | null
          voted_at?: string | null
          voter_address?: string | null
        }
        Relationships: []
      }
      archived_disputes: {
        Row: {
          chain_dispute_id: string | null
          created_at: string | null
          dispute_stake: number | null
          disputer_address: string | null
          disputer_won: boolean | null
          id: string | null
          resolved_at: string | null
          status: string | null
          task_id: string | null
          tx_hash: string | null
          votes_against_disputer: number | null
          votes_for_disputer: number | null
          voting_deadline: string | null
        }
        Insert: {
          chain_dispute_id?: string | null
          created_at?: string | null
          dispute_stake?: number | null
          disputer_address?: string | null
          disputer_won?: boolean | null
          id?: string | null
          resolved_at?: string | null
          status?: string | null
          task_id?: string | null
          tx_hash?: string | null
          votes_against_disputer?: number | null
          votes_for_disputer?: number | null
          voting_deadline?: string | null
        }
        Update: {
          chain_dispute_id?: string | null
          created_at?: string | null
          dispute_stake?: number | null
          disputer_address?: string | null
          disputer_won?: boolean | null
          id?: string | null
          resolved_at?: string | null
          status?: string | null
          task_id?: string | null
          tx_hash?: string | null
          votes_against_disputer?: number | null
          votes_for_disputer?: number | null
          voting_deadline?: string | null
        }
        Relationships: []
      }
      claims: {
        Row: {
          agent_address: string
          claimed_at: string
          created_at: string | null
          deadline: string | null
          id: string
          status: string
          submission_cid: string | null
          submitted_at: string | null
          task_id: string
          updated_at: string | null
          verdict_id: string | null
        }
        Insert: {
          agent_address: string
          claimed_at: string
          created_at?: string | null
          deadline?: string | null
          id?: string
          status?: string
          submission_cid?: string | null
          submitted_at?: string | null
          task_id: string
          updated_at?: string | null
          verdict_id?: string | null
        }
        Update: {
          agent_address?: string
          claimed_at?: string
          created_at?: string | null
          deadline?: string | null
          id?: string
          status?: string
          submission_cid?: string | null
          submitted_at?: string | null
          task_id?: string
          updated_at?: string | null
          verdict_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_verdict"
            columns: ["verdict_id"]
            isOneToOne: false
            referencedRelation: "verdicts"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_events: {
        Row: {
          block_number: string
          chain_id: number
          created_at: string
          error_message: string
          error_stack: string | null
          event_data: Json
          event_name: string
          id: string
          last_retry_at: string | null
          log_index: number
          max_retries: number
          resolution_notes: string | null
          resolved_at: string | null
          retry_count: number
          status: string
          tx_hash: string
        }
        Insert: {
          block_number: string
          chain_id: number
          created_at?: string
          error_message: string
          error_stack?: string | null
          event_data: Json
          event_name: string
          id?: string
          last_retry_at?: string | null
          log_index: number
          max_retries?: number
          resolution_notes?: string | null
          resolved_at?: string | null
          retry_count?: number
          status?: string
          tx_hash: string
        }
        Update: {
          block_number?: string
          chain_id?: number
          created_at?: string
          error_message?: string
          error_stack?: string | null
          event_data?: Json
          event_name?: string
          id?: string
          last_retry_at?: string | null
          log_index?: number
          max_retries?: number
          resolution_notes?: string | null
          resolved_at?: string | null
          retry_count?: number
          status?: string
          tx_hash?: string
        }
        Relationships: []
      }
      judgments: {
        Row: {
          created_at: string
          id: string
          in_consensus: boolean | null
          judge_address: string
          judgment_index: number
          ranking: number[]
          submitted_at: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          in_consensus?: boolean | null
          judge_address: string
          judgment_index: number
          ranking: number[]
          submitted_at?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          in_consensus?: boolean | null
          judge_address?: string
          judgment_index?: number
          ranking?: number[]
          submitted_at?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judgments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_events: {
        Row: {
          block_number: string
          chain_id: number
          event_name: string
          id: string
          log_index: number
          processed_at: string
          tx_hash: string
        }
        Insert: {
          block_number: string
          chain_id: number
          event_name: string
          id?: string
          log_index: number
          processed_at?: string
          tx_hash: string
        }
        Update: {
          block_number?: string
          chain_id?: number
          event_name?: string
          id?: string
          log_index?: number
          processed_at?: string
          tx_hash?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          agent_address: string
          consensus_rank: number | null
          created_at: string
          id: string
          ipfs_fetch_failed: boolean
          is_consensus_winner: boolean | null
          submission_cid: string
          submission_index: number
          submitted_at: string
          task_id: string
          updated_at: string
        }
        Insert: {
          agent_address: string
          consensus_rank?: number | null
          created_at?: string
          id?: string
          ipfs_fetch_failed?: boolean
          is_consensus_winner?: boolean | null
          submission_cid: string
          submission_index?: number
          submitted_at?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          agent_address?: string
          consensus_rank?: number | null
          created_at?: string
          id?: string
          ipfs_fetch_failed?: boolean
          is_consensus_winner?: boolean | null
          submission_cid?: string
          submission_index?: number
          submitted_at?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          chain_id: number
          contract_address: string
          id: string
          last_synced_block: string
          updated_at: string | null
        }
        Insert: {
          chain_id: number
          contract_address: string
          id?: string
          last_synced_block: string
          updated_at?: string | null
        }
        Update: {
          chain_id?: number
          contract_address?: string
          id?: string
          last_synced_block?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_payouts: {
        Row: {
          amount: string
          consensus_rank: number | null
          created_at: string
          id: string
          paid_at: string | null
          recipient_address: string
          role: string
          task_id: string
          tx_hash: string | null
        }
        Insert: {
          amount: string
          consensus_rank?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          recipient_address: string
          role: string
          task_id: string
          tx_hash?: string | null
        }
        Update: {
          amount?: string
          consensus_rank?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          recipient_address?: string
          role?: string
          task_id?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_payouts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          bounty_amount: string
          bounty_token: string
          chain_id: number
          chain_task_id: string
          created_at: string | null
          created_at_block: string
          creator_address: string
          deadline: string | null
          description: string
          id: string
          ipfs_fetch_failed: boolean
          judge_deadline: string | null
          judgment_count: number
          phase: string
          required_judges: number
          required_workers: number
          specification_cid: string
          submission_cid: string | null
          submission_count: number
          submitted_at: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bounty_amount?: string
          bounty_token?: string
          chain_id?: number
          chain_task_id: string
          created_at?: string | null
          created_at_block: string
          creator_address: string
          deadline?: string | null
          description: string
          id?: string
          ipfs_fetch_failed?: boolean
          judge_deadline?: string | null
          judgment_count?: number
          phase?: string
          required_judges?: number
          required_workers?: number
          specification_cid: string
          submission_cid?: string | null
          submission_count?: number
          submitted_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bounty_amount?: string
          bounty_token?: string
          chain_id?: number
          chain_task_id?: string
          created_at?: string | null
          created_at_block?: string
          creator_address?: string
          deadline?: string | null
          description?: string
          id?: string
          ipfs_fetch_failed?: boolean
          judge_deadline?: string | null
          judgment_count?: number
          phase?: string
          required_judges?: number
          required_workers?: number
          specification_cid?: string
          submission_cid?: string | null
          submission_count?: number
          submitted_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      verdicts: {
        Row: {
          claim_id: string
          created_at: string | null
          feedback_cid: string
          id: string
          outcome: string
          score: number
          task_id: string
          tx_hash: string
          verified_at: string
          verifier_address: string
        }
        Insert: {
          claim_id: string
          created_at?: string | null
          feedback_cid: string
          id?: string
          outcome: string
          score: number
          task_id: string
          tx_hash: string
          verified_at: string
          verifier_address: string
        }
        Update: {
          claim_id?: string
          created_at?: string | null
          feedback_cid?: string
          id?: string
          outcome?: string
          score?: number
          task_id?: string
          tx_hash?: string
          verified_at?: string
          verifier_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "verdicts_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verdicts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          agent_address: string
          attempt: number
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          event_name: string
          id: string
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          status: string
          status_code: number | null
        }
        Insert: {
          agent_address: string
          attempt?: number
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_name: string
          id?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload: Json
          status?: string
          status_code?: number | null
        }
        Update: {
          agent_address?: string
          attempt?: number
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_name?: string
          id?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          status?: string
          status_code?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_failed_event: {
        Args: {
          p_block_number: string
          p_chain_id: number
          p_error_message: string
          p_error_stack?: string
          p_event_data: Json
          p_event_name: string
          p_log_index: number
          p_tx_hash: string
        }
        Returns: string
      }
      cleanup_old_processed_events: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      count_tasks_with_bounty_filter: {
        Args: {
          p_creator_address?: string
          p_max_bounty?: string
          p_min_bounty?: string
          p_phase?: string
          p_tags?: string[]
        }
        Returns: number
      }
      get_agents_with_failed_ipfs: {
        Args: { p_limit?: number }
        Returns: {
          address: string
          created_at: string
          id: string
          name: string
          profile_cid: string
        }[]
      }
      get_bounty_statistics: {
        Args: never
        Returns: {
          avg_bounty: number
          max_bounty: number
          min_bounty: number
        }[]
      }
      get_retryable_failed_events: {
        Args: { p_limit?: number }
        Returns: {
          block_number: string
          chain_id: number
          created_at: string
          event_data: Json
          event_name: string
          id: string
          log_index: number
          retry_count: number
          tx_hash: string
        }[]
      }
      get_tag_statistics: {
        Args: { p_limit?: number }
        Returns: {
          count: number
          tag: string
        }[]
      }
      get_tasks_with_failed_ipfs: {
        Args: { p_limit?: number }
        Returns: {
          chain_task_id: string
          created_at: string
          id: string
          specification_cid: string
          title: string
        }[]
      }
      increment_failed_event_retry: {
        Args: {
          p_error_message: string
          p_error_stack: string
          p_event_id: string
          p_last_retry_at: string
        }
        Returns: {
          id: string
          max_retries: number
          retry_count: number
          status: string
        }[]
      }
      is_event_processed: {
        Args: { p_chain_id: number; p_log_index: number; p_tx_hash: string }
        Returns: boolean
      }
      list_tasks_with_bounty_filter: {
        Args: {
          p_creator_address?: string
          p_limit?: number
          p_max_bounty?: string
          p_min_bounty?: string
          p_offset?: number
          p_sort_by?: string
          p_sort_order?: string
          p_phase?: string
          p_tags?: string[]
        }
        Returns: {
          bounty_amount: string
          bounty_token: string
          chain_task_id: string
          created_at: string
          created_at_block: string
          creator_address: string
          deadline: string
          description: string
          id: string
          specification_cid: string
          phase: string
          submission_cid: string
          submitted_at: string
          tags: string[]
          title: string
          updated_at: string
        }[]
      }
      mark_event_processed: {
        Args: {
          p_block_number: string
          p_chain_id: number
          p_event_name: string
          p_log_index: number
          p_tx_hash: string
        }
        Returns: boolean
      }
      resolve_failed_event: {
        Args: { p_event_id: string; p_notes?: string }
        Returns: boolean
      }
      sum_completed_bounties: { Args: never; Returns: string }
      sum_open_bounties: { Args: never; Returns: string }
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
