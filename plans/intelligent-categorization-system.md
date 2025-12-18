# Intelligent Transaction Categorization System

## Overview

This plan implements an intelligent auto-categorization system that learns from user behavior. When you categorize a transaction manually, the system will suggest creating a rule so all future transactions from that merchant are automatically categorized.

## Problem Solved

**Current Issue:** Users import transactions like `BLIZZARD *US1026349678` and `BLIZZARD *US9876543210` which are the same merchant but have different reference numbers. Additionally, major merchants like Amazon have many variations:
- `AMAZON.COM*TM0QZ6HK3`
- `AMAZON MKTPL*DC5HE3GA3`
- `AMAZON MARK*M84651FG3`

All should be recognized as the same merchant.

**Solution:** We need to enhance the merchant normalization, then leverage it to:
1. Detect when you categorize a merchant for the first time
2. Suggest creating a rule for that merchant
3. Auto-apply the rule to all matching transactions
4. Use the rule for all future imports

## Key Components

### 1. Enhanced Merchant Key Normalization (NEEDS IMPROVEMENT)

**Current State:**
The [`generateMerchantKey()`](lib/utils/merchant.ts:19) function:
- Strips out pure numeric sequences (4+ digits): `1026349678` → removed
- Removes common words: `POS`, `ONLINE`, etc.
- Normalizes to uppercase: `BLIZZARD *US` → `BLIZZARD_US`

**Problem:** Doesn't handle mixed alphanumeric codes or merchant variations:
```
AMAZON.COM*TM0QZ6HK3     → AMAZONCOMTM0QZ6HK3     ❌ Keeps code
AMAZON MKTPL*DC5HE3GA3   → AMAZON_MKTPLDC5HE3GA3  ❌ Different key
AMAZON MARK*M84651FG3    → AMAZON_MARK_M84651FG3  ❌ Another key
```

**Solution:** Enhance normalization to:
1. Strip alphanumeric reference codes (pattern: `*` followed by mixed alphanumeric)
2. Remove merchant suffixes: `.COM`, `INC`, `LLC`, etc.
3. Normalize merchant variations: `MKTPL` → `MARKETPLACE`, `MARK` → `MARKETPLACE`
4. Apply aggressive normalization for common merchants

**Expected Result:**
```
AMAZON.COM*TM0QZ6HK3     → AMAZON     ✓
AMAZON MKTPL*DC5HE3GA3   → AMAZON     ✓
AMAZON MARK*M84651FG3    → AMAZON     ✓
BATHANDBODYWORKS.COM     → BATH_BODY_WORKS ✓
```

### 2. Rule Suggestion Workflow

```
User categorizes "BLIZZARD *US1026349678" → Entertainment
    ↓
System checks: Are there other BLIZZARD_US transactions?
    ↓ (Yes, found 5)
Show dialog: "Create rule for BLIZZARD? This will update 5 similar transactions"
    ↓ (User confirms)
Creates rule: merchant_pattern = "blizzard_us" → category = Entertainment
    ↓
Updates all 6 transactions (including current one)
    ↓
Shows success: "Created rule and updated 6 transactions"
```

### 3. Smart Rule Detection

When user manually categorizes a transaction, system checks:
- Does a rule already exist for this merchant_key? → Skip suggestion
- Are there other transactions with same merchant_key? → Suggest rule
- Is this a one-time merchant (only 1 transaction)? → Ask if user wants to create rule anyway

### 4. Rule Management Interface

Full CRUD operations:
- **View:** List all rules with priority, pattern, category, match count
- **Create:** Manually create rules with pattern preview
- **Edit:** Modify pattern, category, priority, amount filters
- **Delete:** Remove rules with warning about affected transactions
- **Reorder:** Drag-and-drop priority management
- **Test:** Preview which transactions would match

### 5. Rules API Endpoints

**GET /api/rules**
- List all user's rules
- Include match counts and last used date
- Support filtering and sorting

**POST /api/rules**
- Create new rule
- Optionally apply to existing transactions
- Return match count

**PATCH /api/rules/[id]**
- Update rule properties
- Re-apply to transactions if requested
- Update priority for reordering

**DELETE /api/rules/[id]**
- Delete rule
- Optionally reset affected transactions to "Uncategorized"

### 6. Enhanced Transaction API

**PATCH /api/transactions**
- Add `createRule` boolean parameter
- Add `rulePattern` string parameter (optional override)
- When `createRule: true`:
  - Create categorization rule
  - Apply to all matching transactions
  - Return stats: `{ updated: 6, ruleCreated: true }`

### 7. Import Process Enhancement

The existing [`categorizeTransactions()`](app/api/import/process/route.ts:202) already:
- Loads all active rules
- Matches by merchant_key pattern
- Updates transactions to `classification_source: 'rule'`
- Increments rule match_count

We'll enhance the import results to show:
```
Imported: 45 transactions
- Auto-categorized by rules: 32
- Manually categorized (from CSV): 8
- Uncategorized: 5
```

## Database Schema (Already Exists!)

The [`categorization_rules`](supabase/migrations/20251216172210_initial_schema.sql:326) table has everything we need:
- `merchant_pattern`: The pattern to match (e.g., "blizzard_us")
- `category_id`: Target category
- `amount_min`, `amount_max`: Optional amount filters
- `priority`: For conflict resolution (higher priority wins)
- `is_active`: Enable/disable without deleting
- `match_count`: Track usage

## UI Components to Build

### RuleSuggestionDialog Component
- Shows after manual categorization
- Displays merchant name and similar transaction count
- Allows editing pattern before creating
- Shows preview of matching transactions
- Options: "Create Rule", "Just This One", "Edit Pattern"

### Rules Management Page
- Table of all rules with columns: Priority, Pattern, Category, Matches, Actions
- Drag handles for priority reordering
- Inline edit capabilities
- Search/filter by pattern or category
- Bulk actions (activate/deactivate)

### Rule Preview Component
- Shows live preview of matching transactions
- Used in both creation and edit dialogs
- Highlights what part of description matches

### Educational Tooltips
- Explain merchant_key concept
- Show examples of how patterns work
- Link to rules management page

## User Experience Flow

### First Time Categorization
1. User imports CSV with 10 Blizzard transactions
2. All show as "Uncategorized"
3. User clicks first one, changes to "Entertainment"
4. Dialog appears: "🎯 Create a rule? Found 9 similar transactions from BLIZZARD"
5. User clicks "Create Rule & Update All"
6. Success message: "Created rule and updated 10 transactions"
7. All 10 now show "Entertainment" with sparkle icon (rule-categorized)

### Subsequent Imports
1. User imports new CSV next month
2. 5 new Blizzard transactions auto-categorized during import
3. Import summary shows: "5 transactions auto-categorized by your rules"
4. User sees sparkle icon on those transactions

### Rule Management
1. User goes to Rules page
2. Sees list of all their rules
3. Can edit "BLIZZARD" rule to be more specific: "BLIZZARD_ENTERTAINMENT"
4. Can add amount filter: only amounts > $10
5. Can test changes before saving
6. Can disable rule temporarily without deleting

## Technical Considerations

### Pattern Matching Strategy
- Use case-insensitive contains matching
- Store patterns in lowercase
- Use merchant_key for matching (already normalized)
- Support wildcards in future enhancement

### Conflict Resolution
- Multiple rules might match same transaction
- Use priority order (higher first)
- First match wins
- User can adjust priorities via drag-and-drop

### Performance
- Rules are cached during import processing
- Batch updates for applying rules
- Index on merchant_key for fast matching

### Data Consistency
- When deleting category, cascade to rules
- When disabling rule, transactions keep their categories
- Track classification_source to identify rule-categorized transactions

## Success Metrics

After implementation, user should:
- Spend <5 minutes categorizing a full month's import
- Have 80%+ auto-categorization rate after first month
- Rarely need to adjust the same merchant twice
- Feel confident the system "learns" their preferences

## Future Enhancements (Not in Current Scope)

- ML-based pattern suggestions
- Shared rule templates from community
- Amount-based auto-rules (e.g., all $9.99 charges)
- Date-based rules (e.g., first of month = rent)
- Multi-condition rules (merchant + amount range + frequency)
