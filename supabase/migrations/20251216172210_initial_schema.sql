/*
  # Personal Finance Management Platform - Initial Schema

  ## Overview
  This migration creates the complete database schema for a personal finance management
  platform with CSV import, smart categorization, recurring charge detection, and bill tracking.

  ## Tables Created
  
  ### 1. accounts
  - Stores bank/financial accounts for each user
  - Fields: id, user_id, name, type, institution, last_synced_at
  - RLS: Users can only access their own accounts

  ### 2. categories
  - Predefined and user-custom expense/income categories
  - Fields: id, user_id (null for system categories), name, type, icon, color
  - RLS: Users see system categories + their own custom categories

  ### 3. uploads
  - Tracks CSV file uploads and import status
  - Fields: id, user_id, filename, status, total_rows, imported_count, duplicate_count, error_count
  - RLS: Users can only access their own uploads

  ### 4. transactions
  - Core transaction data with fingerprint-based deduplication
  - Fields: id, user_id, account_id, posted_date, description, amount, category_id, 
            merchant_key, fingerprint_hash, notes, tags, classification_source
  - RLS: Users can only access their own transactions
  - Unique constraint on (user_id, fingerprint_hash) for deduplication

  ### 5. merchant_aliases
  - Maps various merchant name variations to canonical names
  - Fields: id, user_id, raw_merchant, canonical_merchant, transaction_count
  - RLS: Users manage their own merchant aliases

  ### 6. categorization_rules
  - User-defined rules for automatic transaction categorization
  - Fields: id, user_id, priority, merchant_pattern, category_id, amount_min, amount_max
  - RLS: Users manage their own rules

  ### 7. recurring_series
  - Detected recurring transactions (subscriptions, bills)
  - Fields: id, user_id, merchant_key, cadence, average_amount, confidence, status, next_expected_date
  - RLS: Users can only access their own recurring series

  ### 8. bills
  - Bill tracking with due dates and payment status
  - Fields: id, user_id, recurring_series_id, name, due_day, grace_days, autopay, status
  - RLS: Users can only access their own bills

  ### 9. goals
  - Financial goals (spending caps, savings targets)
  - Fields: id, user_id, type, category_id, target_amount, period, start_date, end_date
  - RLS: Users can only access their own goals

  ### 10. audit_logs
  - Activity tracking for security and debugging
  - Fields: id, user_id, action, resource_type, resource_id, details
  - RLS: Users can only view their own audit logs

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies restrict access to user's own data only
  - System categories accessible to all authenticated users

  ## Indexes
  - Performance indexes on frequently queried fields
  - Unique indexes for deduplication constraints
*/

-- Create enum types for better type safety
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'credit_card', 'investment', 'loan', 'other');
CREATE TYPE category_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE transaction_type AS ENUM ('debit', 'credit');
CREATE TYPE upload_status AS ENUM ('uploading', 'parsing', 'mapping', 'importing', 'categorizing', 'detecting_recurring', 'completed', 'failed');
CREATE TYPE classification_source AS ENUM ('rule', 'learned', 'default', 'manual');
CREATE TYPE recurring_cadence AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual');
CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE recurring_status AS ENUM ('active', 'paused', 'cancelled', 'pending_confirmation');
CREATE TYPE bill_status AS ENUM ('paid', 'due_soon', 'overdue', 'upcoming');
CREATE TYPE goal_type AS ENUM ('category_cap', 'monthly_savings', 'debt_payoff');
CREATE TYPE goal_period AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');

-- ============================================================================
-- ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type account_type NOT NULL DEFAULT 'checking',
  institution text,
  last_four text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type category_type NOT NULL DEFAULT 'expense',
  icon text DEFAULT 'circle',
  color text DEFAULT '#6B7280',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system and own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false)
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

-- ============================================================================
-- UPLOADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  filename text NOT NULL,
  status upload_status DEFAULT 'uploading',
  total_rows integer DEFAULT 0,
  imported_count integer DEFAULT 0,
  duplicate_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  error_details jsonb,
  column_mapping jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_status ON uploads(status);
CREATE INDEX idx_uploads_created_at ON uploads(created_at DESC);

ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploads"
  ON uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
  ON uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON uploads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads"
  ON uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRANSACTIONS TABLE (Core table with deduplication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL,
  
  -- Core transaction fields
  posted_date date NOT NULL,
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  type transaction_type,
  transaction_id text,
  
  -- Normalized fields
  merchant_key text NOT NULL,
  fingerprint_hash text NOT NULL,
  
  -- Categorization
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  classification_source classification_source DEFAULT 'default',
  classification_confidence numeric(3, 2) DEFAULT 0.5,
  
  -- User annotations
  notes text,
  tags text[],
  is_split boolean DEFAULT false,
  split_parent_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Critical: Unique constraint for deduplication
CREATE UNIQUE INDEX idx_transactions_fingerprint_unique 
  ON transactions(user_id, fingerprint_hash);

-- Performance indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_posted_date ON transactions(posted_date DESC);
CREATE INDEX idx_transactions_merchant_key ON transactions(merchant_key);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- MERCHANT_ALIASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS merchant_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_merchant text NOT NULL,
  canonical_merchant text NOT NULL,
  merchant_key text NOT NULL,
  transaction_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_merchant_aliases_user_id ON merchant_aliases(user_id);
CREATE INDEX idx_merchant_aliases_merchant_key ON merchant_aliases(merchant_key);
CREATE UNIQUE INDEX idx_merchant_aliases_unique ON merchant_aliases(user_id, merchant_key);

ALTER TABLE merchant_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own merchant aliases"
  ON merchant_aliases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merchant aliases"
  ON merchant_aliases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own merchant aliases"
  ON merchant_aliases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own merchant aliases"
  ON merchant_aliases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- CATEGORIZATION_RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS categorization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 100,
  merchant_pattern text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount_min numeric(12, 2),
  amount_max numeric(12, 2),
  is_active boolean DEFAULT true,
  match_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_categorization_rules_user_id ON categorization_rules(user_id);
CREATE INDEX idx_categorization_rules_priority ON categorization_rules(priority DESC);
CREATE INDEX idx_categorization_rules_category_id ON categorization_rules(category_id);

ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules"
  ON categorization_rules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
  ON categorization_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
  ON categorization_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
  ON categorization_rules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- RECURRING_SERIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS recurring_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_key text NOT NULL,
  merchant_name text NOT NULL,
  cadence recurring_cadence NOT NULL,
  average_amount numeric(12, 2) NOT NULL,
  last_amount numeric(12, 2),
  amount_variance numeric(5, 2),
  confidence confidence_level DEFAULT 'medium',
  status recurring_status DEFAULT 'pending_confirmation',
  occurrence_count integer DEFAULT 0,
  last_occurrence_date date,
  next_expected_date date,
  tolerance_days integer DEFAULT 3,
  is_variable boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_recurring_series_user_id ON recurring_series(user_id);
CREATE INDEX idx_recurring_series_merchant_key ON recurring_series(merchant_key);
CREATE INDEX idx_recurring_series_status ON recurring_series(status);
CREATE INDEX idx_recurring_series_next_expected ON recurring_series(next_expected_date);

ALTER TABLE recurring_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring series"
  ON recurring_series FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring series"
  ON recurring_series FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring series"
  ON recurring_series FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring series"
  ON recurring_series FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- BILLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_series_id uuid REFERENCES recurring_series(id) ON DELETE SET NULL,
  name text NOT NULL,
  typical_amount numeric(12, 2),
  amount_range_min numeric(12, 2),
  amount_range_max numeric(12, 2),
  due_day integer NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  grace_days integer DEFAULT 3,
  autopay boolean DEFAULT false,
  status bill_status DEFAULT 'upcoming',
  last_paid_date date,
  next_due_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_next_due_date ON bills(next_due_date);
CREATE INDEX idx_bills_recurring_series_id ON bills(recurring_series_id);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bills"
  ON bills FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bills"
  ON bills FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills"
  ON bills FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bills"
  ON bills FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type goal_type NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  target_amount numeric(12, 2) NOT NULL,
  current_amount numeric(12, 2) DEFAULT 0,
  period goal_period DEFAULT 'monthly',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_category_id ON goals(category_id);
CREATE INDEX idx_goals_type ON goals(type);
CREATE INDEX idx_goals_period ON goals(period);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SEED DEFAULT SYSTEM CATEGORIES
-- ============================================================================
INSERT INTO categories (id, user_id, name, type, icon, color, is_system) VALUES
  (gen_random_uuid(), NULL, 'Salary', 'income', 'banknote', '#10B981', true),
  (gen_random_uuid(), NULL, 'Investment Income', 'income', 'trending-up', '#059669', true),
  (gen_random_uuid(), NULL, 'Refunds', 'income', 'undo-2', '#34D399', true),
  (gen_random_uuid(), NULL, 'Other Income', 'income', 'circle-dollar-sign', '#6EE7B7', true),
  
  (gen_random_uuid(), NULL, 'Groceries', 'expense', 'shopping-cart', '#F59E0B', true),
  (gen_random_uuid(), NULL, 'Dining & Restaurants', 'expense', 'utensils', '#EF4444', true),
  (gen_random_uuid(), NULL, 'Transportation', 'expense', 'car', '#3B82F6', true),
  (gen_random_uuid(), NULL, 'Gas & Fuel', 'expense', 'fuel', '#6366F1', true),
  (gen_random_uuid(), NULL, 'Entertainment', 'expense', 'film', '#EC4899', true),
  (gen_random_uuid(), NULL, 'Shopping', 'expense', 'shopping-bag', '#8B5CF6', true),
  (gen_random_uuid(), NULL, 'Healthcare', 'expense', 'heart-pulse', '#14B8A6', true),
  (gen_random_uuid(), NULL, 'Insurance', 'expense', 'shield', '#06B6D4', true),
  (gen_random_uuid(), NULL, 'Utilities', 'expense', 'zap', '#F97316', true),
  (gen_random_uuid(), NULL, 'Rent & Mortgage', 'expense', 'home', '#DC2626', true),
  (gen_random_uuid(), NULL, 'Phone & Internet', 'expense', 'wifi', '#0EA5E9', true),
  (gen_random_uuid(), NULL, 'Subscriptions', 'expense', 'refresh-cw', '#A855F7', true),
  (gen_random_uuid(), NULL, 'Fitness & Gym', 'expense', 'dumbbell', '#22C55E', true),
  (gen_random_uuid(), NULL, 'Travel', 'expense', 'plane', '#F43F5E', true),
  (gen_random_uuid(), NULL, 'Education', 'expense', 'graduation-cap', '#8B5CF6', true),
  (gen_random_uuid(), NULL, 'Personal Care', 'expense', 'scissors', '#EC4899', true),
  (gen_random_uuid(), NULL, 'Gifts & Donations', 'expense', 'gift', '#F472B6', true),
  (gen_random_uuid(), NULL, 'Bills & Payments', 'expense', 'file-text', '#DC2626', true),
  (gen_random_uuid(), NULL, 'Uncategorized', 'expense', 'help-circle', '#6B7280', true),
  
  (gen_random_uuid(), NULL, 'Transfer', 'transfer', 'arrow-right-left', '#9CA3AF', true)
ON CONFLICT DO NOTHING;
