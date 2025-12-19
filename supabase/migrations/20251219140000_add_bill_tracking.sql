/*
  # Add Bill Tracking Table
  
  Creates a table to track user preferences and status for bills in the "Bills & Payments" category.
  Similar to subscription_tracking but focused on monthly bill payment tracking.
*/

-- Create bill_tracking table
CREATE TABLE IF NOT EXISTS bill_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_key text NOT NULL,
  
  -- User-managed status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paid_this_month')),
  
  -- Due date tracking
  typical_due_day integer CHECK (typical_due_day >= 1 AND typical_due_day <= 31),
  last_paid_date date,
  
  -- User annotations
  notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one entry per user per merchant
  UNIQUE(user_id, merchant_key)
);

-- Create indexes
CREATE INDEX idx_bill_tracking_user_id ON bill_tracking(user_id);
CREATE INDEX idx_bill_tracking_merchant_key ON bill_tracking(merchant_key);
CREATE INDEX idx_bill_tracking_status ON bill_tracking(status);

-- Enable RLS
ALTER TABLE bill_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own bill tracking"
  ON bill_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bill tracking"
  ON bill_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bill tracking"
  ON bill_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bill tracking"
  ON bill_tracking FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
