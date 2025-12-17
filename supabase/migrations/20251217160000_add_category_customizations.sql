/*
  # Category Customizations Migration
  
  ## Overview
  Allows users to customize icon and color for system categories without modifying
  the base category records. Custom categories still use the categories table directly.
  
  ## Changes
  - Create category_customizations table for user-specific overrides
  - Add RLS policies for secure access
  - Add indexes for performance
*/

-- ============================================================================
-- CATEGORY_CUSTOMIZATIONS TABLE
-- ============================================================================
-- Stores user-specific customizations for system categories (icon and color overrides)
CREATE TABLE IF NOT EXISTS category_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  icon text,
  color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one customization per user per category
  UNIQUE(user_id, category_id)
);

-- Indexes for performance
CREATE INDEX idx_category_customizations_user_id ON category_customizations(user_id);
CREATE INDEX idx_category_customizations_category_id ON category_customizations(category_id);

-- Enable Row Level Security
ALTER TABLE category_customizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own category customizations"
  ON category_customizations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category customizations"
  ON category_customizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category customizations"
  ON category_customizations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own category customizations"
  ON category_customizations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPFUL VIEW (Optional)
-- ============================================================================
-- Create a view that combines categories with user customizations
-- This makes it easier to fetch categories with applied customizations
CREATE OR REPLACE VIEW user_categories_view AS
SELECT 
  c.id,
  c.user_id as category_user_id,
  c.name,
  c.type,
  COALESCE(cc.icon, c.icon) as icon,
  COALESCE(cc.color, c.color) as color,
  c.is_system,
  c.created_at,
  cc.user_id as customization_user_id,
  cc.id as customization_id
FROM categories c
LEFT JOIN category_customizations cc ON c.id = cc.category_id;

-- Note: This view doesn't have RLS automatically, so we still need to filter by user_id in queries
COMMENT ON VIEW user_categories_view IS 'Combines categories with user-specific customizations. Always filter by user_id when querying.';
