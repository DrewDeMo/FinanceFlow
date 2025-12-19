/*
  # Add Calendar Notes Table
  
  Creates a table to store user daily notes for financial calendar annotations.
  Users can add notes to any day to track reminders, explain high spending, or set financial goals.
*/

-- Create calendar_notes table
CREATE TABLE IF NOT EXISTS calendar_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_date date NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one note per user per day
  UNIQUE(user_id, note_date)
);

-- Create indexes
CREATE INDEX idx_calendar_notes_user_id ON calendar_notes(user_id);
CREATE INDEX idx_calendar_notes_date ON calendar_notes(note_date);
CREATE INDEX idx_calendar_notes_user_date ON calendar_notes(user_id, note_date);

-- Enable RLS
ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own calendar notes"
  ON calendar_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar notes"
  ON calendar_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar notes"
  ON calendar_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar notes"
  ON calendar_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_notes_timestamp
BEFORE UPDATE ON calendar_notes
FOR EACH ROW
EXECUTE FUNCTION update_calendar_notes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE calendar_notes IS 'Stores daily notes for financial calendar annotations';
COMMENT ON COLUMN calendar_notes.note_date IS 'The date this note is associated with';
COMMENT ON COLUMN calendar_notes.content IS 'The note content - can include reminders, spending explanations, or financial goals';
