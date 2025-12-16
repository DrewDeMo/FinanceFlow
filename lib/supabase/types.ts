export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'other';
export type CategoryType = 'income' | 'expense' | 'transfer';
export type TransactionType = 'debit' | 'credit';
export type UploadStatus = 'uploading' | 'parsing' | 'mapping' | 'importing' | 'categorizing' | 'detecting_recurring' | 'completed' | 'failed';
export type ClassificationSource = 'rule' | 'learned' | 'default' | 'manual';
export type RecurringCadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RecurringStatus = 'active' | 'paused' | 'cancelled' | 'pending_confirmation';
export type BillStatus = 'paid' | 'due_soon' | 'overdue' | 'upcoming';
export type GoalType = 'category_cap' | 'monthly_savings' | 'debt_payoff';
export type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          institution: string | null;
          last_four: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: AccountType;
          institution?: string | null;
          last_four?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
          institution?: string | null;
          last_four?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          type: CategoryType;
          icon: string;
          color: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          type?: CategoryType;
          icon?: string;
          color?: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          type?: CategoryType;
          icon?: string;
          color?: string;
          is_system?: boolean;
          created_at?: string;
        };
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          filename: string;
          status: UploadStatus;
          total_rows: number;
          imported_count: number;
          duplicate_count: number;
          error_count: number;
          error_details: Json | null;
          column_mapping: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          filename: string;
          status?: UploadStatus;
          total_rows?: number;
          imported_count?: number;
          duplicate_count?: number;
          error_count?: number;
          error_details?: Json | null;
          column_mapping?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          filename?: string;
          status?: UploadStatus;
          total_rows?: number;
          imported_count?: number;
          duplicate_count?: number;
          error_count?: number;
          error_details?: Json | null;
          column_mapping?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          upload_id: string | null;
          posted_date: string;
          description: string;
          amount: number;
          type: TransactionType | null;
          transaction_id: string | null;
          merchant_key: string;
          fingerprint_hash: string;
          category_id: string | null;
          classification_source: ClassificationSource;
          classification_confidence: number;
          notes: string | null;
          tags: string[] | null;
          is_split: boolean;
          split_parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          upload_id?: string | null;
          posted_date: string;
          description: string;
          amount: number;
          type?: TransactionType | null;
          transaction_id?: string | null;
          merchant_key: string;
          fingerprint_hash: string;
          category_id?: string | null;
          classification_source?: ClassificationSource;
          classification_confidence?: number;
          notes?: string | null;
          tags?: string[] | null;
          is_split?: boolean;
          split_parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          upload_id?: string | null;
          posted_date?: string;
          description?: string;
          amount?: number;
          type?: TransactionType | null;
          transaction_id?: string | null;
          merchant_key?: string;
          fingerprint_hash?: string;
          category_id?: string | null;
          classification_source?: ClassificationSource;
          classification_confidence?: number;
          notes?: string | null;
          tags?: string[] | null;
          is_split?: boolean;
          split_parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      merchant_aliases: {
        Row: {
          id: string;
          user_id: string;
          raw_merchant: string;
          canonical_merchant: string;
          merchant_key: string;
          transaction_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          raw_merchant: string;
          canonical_merchant: string;
          merchant_key: string;
          transaction_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          raw_merchant?: string;
          canonical_merchant?: string;
          merchant_key?: string;
          transaction_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      categorization_rules: {
        Row: {
          id: string;
          user_id: string;
          priority: number;
          merchant_pattern: string;
          category_id: string;
          amount_min: number | null;
          amount_max: number | null;
          is_active: boolean;
          match_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          priority?: number;
          merchant_pattern: string;
          category_id: string;
          amount_min?: number | null;
          amount_max?: number | null;
          is_active?: boolean;
          match_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          priority?: number;
          merchant_pattern?: string;
          category_id?: string;
          amount_min?: number | null;
          amount_max?: number | null;
          is_active?: boolean;
          match_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      recurring_series: {
        Row: {
          id: string;
          user_id: string;
          merchant_key: string;
          merchant_name: string;
          cadence: RecurringCadence;
          average_amount: number;
          last_amount: number | null;
          amount_variance: number | null;
          confidence: ConfidenceLevel;
          status: RecurringStatus;
          occurrence_count: number;
          last_occurrence_date: string | null;
          next_expected_date: string | null;
          tolerance_days: number;
          is_variable: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          merchant_key: string;
          merchant_name: string;
          cadence: RecurringCadence;
          average_amount: number;
          last_amount?: number | null;
          amount_variance?: number | null;
          confidence?: ConfidenceLevel;
          status?: RecurringStatus;
          occurrence_count?: number;
          last_occurrence_date?: string | null;
          next_expected_date?: string | null;
          tolerance_days?: number;
          is_variable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          merchant_key?: string;
          merchant_name?: string;
          cadence?: RecurringCadence;
          average_amount?: number;
          last_amount?: number | null;
          amount_variance?: number | null;
          confidence?: ConfidenceLevel;
          status?: RecurringStatus;
          occurrence_count?: number;
          last_occurrence_date?: string | null;
          next_expected_date?: string | null;
          tolerance_days?: number;
          is_variable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          user_id: string;
          recurring_series_id: string | null;
          name: string;
          typical_amount: number | null;
          amount_range_min: number | null;
          amount_range_max: number | null;
          due_day: number;
          grace_days: number;
          autopay: boolean;
          status: BillStatus;
          last_paid_date: string | null;
          next_due_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recurring_series_id?: string | null;
          name: string;
          typical_amount?: number | null;
          amount_range_min?: number | null;
          amount_range_max?: number | null;
          due_day: number;
          grace_days?: number;
          autopay?: boolean;
          status?: BillStatus;
          last_paid_date?: string | null;
          next_due_date: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recurring_series_id?: string | null;
          name?: string;
          typical_amount?: number | null;
          amount_range_min?: number | null;
          amount_range_max?: number | null;
          due_day?: number;
          grace_days?: number;
          autopay?: boolean;
          status?: BillStatus;
          last_paid_date?: string | null;
          next_due_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: GoalType;
          category_id: string | null;
          target_amount: number;
          current_amount: number;
          period: GoalPeriod;
          start_date: string;
          end_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: GoalType;
          category_id?: string | null;
          target_amount: number;
          current_amount?: number;
          period?: GoalPeriod;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: GoalType;
          category_id?: string | null;
          target_amount?: number;
          current_amount?: number;
          period?: GoalPeriod;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
