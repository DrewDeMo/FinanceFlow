-- Add subscription detection fields to recurring_series table
ALTER TABLE recurring_series 
ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_confidence INTEGER DEFAULT 0;

-- Add index for subscription queries
CREATE INDEX IF NOT EXISTS idx_recurring_series_is_subscription 
ON recurring_series(user_id, is_subscription) 
WHERE is_subscription = true;

-- Add comment for documentation
COMMENT ON COLUMN recurring_series.is_subscription IS 'AI-detected flag indicating if this is likely a subscription service';
COMMENT ON COLUMN recurring_series.subscription_confidence IS 'Confidence score (0-100) that this recurring charge is a subscription';
