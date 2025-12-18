-- Create subscription_tracking table to track user-managed subscription status
CREATE TABLE IF NOT EXISTS subscription_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  merchant_key TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'cancelled')) NOT NULL DEFAULT 'active',
  cancelled_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, merchant_key)
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscription_tracking_user_id 
ON subscription_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_tracking_user_merchant 
ON subscription_tracking(user_id, merchant_key);

-- Add RLS policies
ALTER TABLE subscription_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription tracking
CREATE POLICY "Users can view own subscription tracking"
ON subscription_tracking
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscription tracking
CREATE POLICY "Users can insert own subscription tracking"
ON subscription_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscription tracking
CREATE POLICY "Users can update own subscription tracking"
ON subscription_tracking
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscription tracking
CREATE POLICY "Users can delete own subscription tracking"
ON subscription_tracking
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_tracking_timestamp
BEFORE UPDATE ON subscription_tracking
FOR EACH ROW
EXECUTE FUNCTION update_subscription_tracking_updated_at();

-- Add comment for documentation
COMMENT ON TABLE subscription_tracking IS 'Tracks user-managed subscription status for merchants in the Subscriptions category';
COMMENT ON COLUMN subscription_tracking.merchant_key IS 'The merchant key from transactions table';
COMMENT ON COLUMN subscription_tracking.status IS 'User-set status: active or cancelled';
COMMENT ON COLUMN subscription_tracking.cancelled_date IS 'Date when user marked the subscription as cancelled';
