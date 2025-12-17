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
      accounts: {
        Row: {
          created_at: string | null
          id: string
          institution: string | null
          is_active: boolean | null
          last_four: string | null
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean | null
          last_four?: string | null
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean | null
          last_four?: string | null
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount_range_max: number | null
          amount_range_min: number | null
          autopay: boolean | null
          created_at: string | null
          due_day: number
          grace_days: number | null
          id: string
          is_active: boolean | null
          last_paid_date: string | null
          name: string
          next_due_date: string
          recurring_series_id: string | null
          status: Database["public"]["Enums"]["bill_status"] | null
          typical_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_range_max?: number | null
          amount_range_min?: number | null
          autopay?: boolean | null
          created_at?: string | null
          due_day: number
          grace_days?: number | null
          id?: string
          is_active?: boolean | null
          last_paid_date?: string | null
          name: string
          next_due_date: string
          recurring_series_id?: string | null
          status?: Database["public"]["Enums"]["bill_status"] | null
          typical_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_range_max?: number | null
          amount_range_min?: number | null
          autopay?: boolean | null
          created_at?: string | null
          due_day?: number
          grace_days?: number | null
          id?: string
          is_active?: boolean | null
          last_paid_date?: string | null
          name?: string
          next_due_date?: string
          recurring_series_id?: string | null
          status?: Database["public"]["Enums"]["bill_status"] | null
          typical_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_recurring_series_id_fkey"
            columns: ["recurring_series_id"]
            isOneToOne: false
            referencedRelation: "recurring_series"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          type: Database["public"]["Enums"]["category_type"]
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          type?: Database["public"]["Enums"]["category_type"]
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      categorization_rules: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          category_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          match_count: number | null
          merchant_pattern: string
          priority: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          category_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_count?: number | null
          merchant_pattern: string
          priority?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          category_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          match_count?: number | null
          merchant_pattern?: string
          priority?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_categories_view"
            referencedColumns: ["id"]
          },
        ]
      }
      category_customizations: {
        Row: {
          category_id: string
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_customizations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_customizations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_categories_view"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          created_at: string | null
          current_amount: number | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          period: Database["public"]["Enums"]["goal_period"] | null
          start_date: string
          target_amount: number
          type: Database["public"]["Enums"]["goal_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          period?: Database["public"]["Enums"]["goal_period"] | null
          start_date: string
          target_amount: number
          type: Database["public"]["Enums"]["goal_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          period?: Database["public"]["Enums"]["goal_period"] | null
          start_date?: string
          target_amount?: number
          type?: Database["public"]["Enums"]["goal_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_categories_view"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_aliases: {
        Row: {
          canonical_merchant: string
          created_at: string | null
          id: string
          merchant_key: string
          raw_merchant: string
          transaction_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canonical_merchant: string
          created_at?: string | null
          id?: string
          merchant_key: string
          raw_merchant: string
          transaction_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canonical_merchant?: string
          created_at?: string | null
          id?: string
          merchant_key?: string
          raw_merchant?: string
          transaction_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_series: {
        Row: {
          amount_variance: number | null
          average_amount: number
          cadence: Database["public"]["Enums"]["recurring_cadence"]
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string | null
          id: string
          is_subscription: boolean | null
          is_variable: boolean | null
          last_amount: number | null
          last_occurrence_date: string | null
          merchant_key: string
          merchant_name: string
          next_expected_date: string | null
          occurrence_count: number | null
          status: Database["public"]["Enums"]["recurring_status"] | null
          subscription_confidence: number | null
          tolerance_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_variance?: number | null
          average_amount: number
          cadence: Database["public"]["Enums"]["recurring_cadence"]
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string | null
          id?: string
          is_subscription?: boolean | null
          is_variable?: boolean | null
          last_amount?: number | null
          last_occurrence_date?: string | null
          merchant_key: string
          merchant_name: string
          next_expected_date?: string | null
          occurrence_count?: number | null
          status?: Database["public"]["Enums"]["recurring_status"] | null
          subscription_confidence?: number | null
          tolerance_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_variance?: number | null
          average_amount?: number
          cadence?: Database["public"]["Enums"]["recurring_cadence"]
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string | null
          id?: string
          is_subscription?: boolean | null
          is_variable?: boolean | null
          last_amount?: number | null
          last_occurrence_date?: string | null
          merchant_key?: string
          merchant_name?: string
          next_expected_date?: string | null
          occurrence_count?: number | null
          status?: Database["public"]["Enums"]["recurring_status"] | null
          subscription_confidence?: number | null
          tolerance_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          classification_confidence: number | null
          classification_source:
            | Database["public"]["Enums"]["classification_source"]
            | null
          created_at: string | null
          description: string
          fingerprint_hash: string
          id: string
          is_split: boolean | null
          merchant_key: string
          notes: string | null
          posted_date: string
          split_parent_id: string | null
          tags: string[] | null
          transaction_id: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string | null
          upload_id: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          classification_confidence?: number | null
          classification_source?:
            | Database["public"]["Enums"]["classification_source"]
            | null
          created_at?: string | null
          description: string
          fingerprint_hash: string
          id?: string
          is_split?: boolean | null
          merchant_key: string
          notes?: string | null
          posted_date: string
          split_parent_id?: string | null
          tags?: string[] | null
          transaction_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"] | null
          updated_at?: string | null
          upload_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          classification_confidence?: number | null
          classification_source?:
            | Database["public"]["Enums"]["classification_source"]
            | null
          created_at?: string | null
          description?: string
          fingerprint_hash?: string
          id?: string
          is_split?: boolean | null
          merchant_key?: string
          notes?: string | null
          posted_date?: string
          split_parent_id?: string | null
          tags?: string[] | null
          transaction_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"] | null
          updated_at?: string | null
          upload_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_categories_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_split_parent_id_fkey"
            columns: ["split_parent_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          account_id: string | null
          column_mapping: Json | null
          completed_at: string | null
          created_at: string | null
          duplicate_count: number | null
          error_count: number | null
          error_details: Json | null
          filename: string
          id: string
          imported_count: number | null
          status: Database["public"]["Enums"]["upload_status"] | null
          total_rows: number | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duplicate_count?: number | null
          error_count?: number | null
          error_details?: Json | null
          filename: string
          id?: string
          imported_count?: number | null
          status?: Database["public"]["Enums"]["upload_status"] | null
          total_rows?: number | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          duplicate_count?: number | null
          error_count?: number | null
          error_details?: Json | null
          filename?: string
          id?: string
          imported_count?: number | null
          status?: Database["public"]["Enums"]["upload_status"] | null
          total_rows?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_categories_view: {
        Row: {
          category_user_id: string | null
          color: string | null
          created_at: string | null
          customization_id: string | null
          customization_user_id: string | null
          icon: string | null
          id: string | null
          is_system: boolean | null
          name: string | null
          type: Database["public"]["Enums"]["category_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "credit_card"
        | "investment"
        | "loan"
        | "other"
      bill_status: "paid" | "due_soon" | "overdue" | "upcoming"
      category_type: "income" | "expense" | "transfer"
      classification_source: "rule" | "learned" | "default" | "manual"
      confidence_level: "high" | "medium" | "low"
      goal_period: "weekly" | "monthly" | "quarterly" | "yearly"
      goal_type: "category_cap" | "monthly_savings" | "debt_payoff"
      recurring_cadence:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "annual"
      recurring_status:
        | "active"
        | "paused"
        | "cancelled"
        | "pending_confirmation"
      transaction_type: "debit" | "credit"
      upload_status:
        | "uploading"
        | "parsing"
        | "mapping"
        | "importing"
        | "categorizing"
        | "detecting_recurring"
        | "completed"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
    Enums: {
      account_type: [
        "checking",
        "savings",
        "credit_card",
        "investment",
        "loan",
        "other",
      ],
      bill_status: ["paid", "due_soon", "overdue", "upcoming"],
      category_type: ["income", "expense", "transfer"],
      classification_source: ["rule", "learned", "default", "manual"],
      confidence_level: ["high", "medium", "low"],
      goal_period: ["weekly", "monthly", "quarterly", "yearly"],
      goal_type: ["category_cap", "monthly_savings", "debt_payoff"],
      recurring_cadence: [
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "annual",
      ],
      recurring_status: [
        "active",
        "paused",
        "cancelled",
        "pending_confirmation",
      ],
      transaction_type: ["debit", "credit"],
      upload_status: [
        "uploading",
        "parsing",
        "mapping",
        "importing",
        "categorizing",
        "detecting_recurring",
        "completed",
        "failed",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
