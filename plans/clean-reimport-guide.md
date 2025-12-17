# Clean Reimport Guide

## Quick Reset Script (Supabase SQL Editor)

Run this to clear all transactions and custom categories for a clean slate:

```sql
-- Delete all transactions for your user
DELETE FROM transactions 
WHERE user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08';

-- Delete all custom categories (keeps system categories)
DELETE FROM categories 
WHERE user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08' 
  AND is_system = false;

-- Delete upload history (optional)
DELETE FROM uploads 
WHERE user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08';

-- Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM transactions WHERE user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08') as transactions,
  (SELECT COUNT(*) FROM categories WHERE user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08') as custom_categories,
  (SELECT COUNT(*) FROM uploads WHERE user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08') as uploads;
```

## What to Expect After Reimport

With the fix now in place, when you reimport `example.csv`:

### ✅ Categories That Will Be Created
All categories from your CSV will be auto-created:
- Admission & Tickets
- Beer, Wine & Spirits
- Books & Magazines
- Cable & Internet
- Clothing
- Coffee Shop
- Dentist
- Doctor
- Electronics
- Fast Food
- Gasoline
- Gifts
- Hair
- Hobbies
- Home Supplies
- Membership
- Movies & Music
- Other
- Paycheck (as income)
- Personal Care Products
- Pharmacy
- Restaurants
- Shipping
- Tax

### ✅ Special Handling
- **"No Category"** (lines 277-290) → Maps to system "Uncategorized" + marked as `'default'` for rule processing
- **"Transfer"** → Maps to system "Transfer" category
- **"Groceries"** → Maps to system "Groceries" category

### ✅ Classification Sources
- Rows **with a category** in CSV → `classification_source='manual'`
- Rows **with "No Category"** → `classification_source='default'` (allows rules to run)
- After rules run → Changes to `classification_source='rule'`

## Expected Results

After import:
- **Total Transactions**: 290
- **Custom Categories**: ~21 (new ones created from CSV)
- **System Categories Used**: Uncategorized, Transfer, Groceries
- **"No Category" Rows**: 14 transactions marked as "Uncategorized" with `classification_source='default'`

## Verify Import Success

Run these queries after import:

### Check category distribution
```sql
SELECT 
  c.name,
  c.type,
  c.is_system,
  COUNT(t.id) as transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08'
GROUP BY c.id, c.name, c.type, c.is_system
ORDER BY transaction_count DESC;
```

### Check "No Category" handling
```sql
SELECT 
  t.description,
  c.name as category_name,
  t.classification_source,
  t.posted_date
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08'
  AND t.posted_date = '2025-12-16'
ORDER BY t.description;
```

Expected: All 12/16/25 transactions should have proper categories, not stuck in Uncategorized.

## Categorization Rules (Optional)

If you want automatic categorization for transactions with "No Category", create rules like:

```sql
-- Example: Auto-categorize STEAMGAMES to Hobbies
INSERT INTO categorization_rules (user_id, merchant_pattern, category_id, priority, is_active)
SELECT 
  'ef43fc1a-58aa-41de-9493-d28325f67c08' as user_id,
  'steam' as merchant_pattern,
  id as category_id,
  100 as priority,
  true as is_active
FROM categories 
WHERE name = 'Hobbies' 
  AND user_id = 'ef43fc1a-58aa-41de-9493-d28325f67c08';
```

Rules will automatically run on transactions marked as `classification_source='default'`.

## Troubleshooting

### If categories still aren't matching:
1. Check the category name exactly as it appears in CSV
2. Verify case-insensitive matching is working
3. Check for extra whitespace or special characters

### If "No Category" rows stay uncategorized:
1. Verify they're marked as `classification_source='default'`
2. Create categorization rules for common merchants
3. Or manually categorize them in the UI

## Clean Import Process

1. **Run the cleanup SQL** (above)
2. **Navigate to** Import page in your app
3. **Upload** `example.csv`
4. **Wait** for import to complete
5. **Verify** categories were created and assigned correctly
6. **Create rules** for automatic categorization (if desired)
7. **Test** with new imports to ensure consistency
