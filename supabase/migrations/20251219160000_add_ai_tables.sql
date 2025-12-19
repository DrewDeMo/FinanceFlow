/*
  # AI Financial Assistant Tables
  
  This migration creates tables for the AI chat assistant feature:
  
  1. ai_conversations - Stores conversation metadata
  2. ai_messages - Stores individual messages within conversations
  3. user_ai_preferences - Stores user preferences for AI (model selection)
  
  Also creates a view for aggregated financial summaries.
*/

-- Create enum for message roles
CREATE TYPE ai_message_role AS ENUM ('user', 'assistant', 'system');

-- Create enum for context types
CREATE TYPE ai_context_type AS ENUM ('monthly', 'yearly', 'custom', 'all');

-- ============================================================================
-- USER_AI_PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_model text NOT NULL DEFAULT 'gpt-4o-mini',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_ai_preferences_user_id ON user_ai_preferences(user_id);

ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai preferences"
  ON user_ai_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai preferences"
  ON user_ai_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai preferences"
  ON user_ai_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai preferences"
  ON user_ai_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- AI_CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  context_type ai_context_type DEFAULT 'monthly',
  context_date_start date,
  context_date_end date,
  message_count integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- AI_MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role ai_message_role NOT NULL,
  content text NOT NULL,
  tokens integer DEFAULT 0,
  model text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at ASC);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Messages are accessible if user owns the parent conversation
CREATE POLICY "Users can view messages from own conversations"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own conversations"
  ON ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from own conversations"
  ON ai_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: Update conversation message count and timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET 
    message_count = message_count + 1,
    total_tokens = total_tokens + COALESCE(NEW.tokens, 0),
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================================
-- FUNCTION: Auto-generate conversation title from first user message
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_title_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE ai_conversations
    SET title = CASE 
      WHEN title = 'New Conversation' THEN 
        LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
      ELSE title
    END
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_title_conversation
  AFTER INSERT ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_title_conversation();

-- ============================================================================
-- VIEW: Monthly financial summary for AI context
-- ============================================================================
CREATE OR REPLACE VIEW monthly_financial_summary AS
SELECT 
  t.user_id,
  date_trunc('month', t.posted_date)::date as month,
  c.name as category_name,
  c.type as category_type,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_income,
  AVG(ABS(t.amount)) as avg_amount
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY t.user_id, date_trunc('month', t.posted_date), c.name, c.type;

-- ============================================================================
-- VIEW: Top merchants by spending
-- ============================================================================
CREATE OR REPLACE VIEW top_merchants_summary AS
SELECT 
  t.user_id,
  t.merchant_key,
  COUNT(*) as transaction_count,
  SUM(ABS(t.amount)) as total_spent,
  AVG(ABS(t.amount)) as avg_amount,
  MAX(t.posted_date) as last_transaction_date
FROM transactions t
WHERE t.amount < 0
GROUP BY t.user_id, t.merchant_key;

-- ============================================================================
-- VIEW: Recurring charges summary
-- ============================================================================
CREATE OR REPLACE VIEW recurring_summary AS
SELECT 
  user_id,
  COUNT(*) as total_recurring,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  SUM(average_amount) FILTER (WHERE status = 'active') as total_monthly_recurring,
  SUM(average_amount) FILTER (WHERE status = 'active' AND is_subscription = true) as total_subscriptions
FROM recurring_series
GROUP BY user_id;
