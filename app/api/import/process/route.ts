import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { parseAmount, parseDate, CSVRow, ColumnMapping } from '@/lib/utils/csv-parser';
import { generateMerchantKey, extractMerchantDisplayName } from '@/lib/utils/merchant';
import { generateTransactionFingerprint } from '@/lib/utils/fingerprint';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

interface ProcessRequest {
  uploadId: string;
  rows: CSVRow[];
  mapping: ColumnMapping;
  accountId?: string | null;
}

/**
 * Build a lookup map of merchant_key -> category_id from existing transactions
 * This enables "learn from history" auto-categorization
 * Priority: manual > learned (ignores 'rule' and 'default' classifications)
 */
async function buildMerchantCategoryLookup(userId: string): Promise<Map<string, string>> {
  const merchantCategoryMap = new Map<string, string>();

  // Get all transactions that were manually categorized or learned
  // These represent the user's true categorization preferences
  const { data: existingTransactions, error } = await supabase
    .from('transactions')
    .select('merchant_key, category_id, classification_source')
    .eq('user_id', userId)
    .in('classification_source', ['manual', 'learned'])
    .not('category_id', 'is', null);

  if (error) {
    console.error('Error fetching merchant history:', error);
    return merchantCategoryMap;
  }

  // Build the lookup map - later entries (more recent) will overwrite earlier ones
  // This means the most recent categorization choice wins
  for (const tx of existingTransactions || []) {
    if (tx.merchant_key && tx.category_id) {
      merchantCategoryMap.set(tx.merchant_key.toLowerCase(), tx.category_id);
    }
  }

  console.log(`Built merchant category lookup with ${merchantCategoryMap.size} unique merchants`);
  return merchantCategoryMap;
}

export async function POST(request: NextRequest) {
  console.log('Import API route called');

  try {
    const body: ProcessRequest = await request.json();
    console.log('Request body parsed:', { uploadId: body.uploadId, rowCount: body.rows?.length });
    const { uploadId, rows, mapping, accountId } = body;

    const uploadResult = await supabase
      .from('uploads')
      .select('user_id')
      .eq('id', uploadId)
      .maybeSingle();

    if (uploadResult.error || !uploadResult.data) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const upload: { user_id: string } = uploadResult.data;
    const userId = upload.user_id;

    // Get categories (for finding "Uncategorized" category)
    const categoriesResult = await supabase
      .from('categories')
      .select('id, name, type')
      .or(`user_id.eq.${userId},is_system.eq.true`);

    const categories: Array<{ id: string; name: string; type: string }> = categoriesResult.data || [];
    const uncategorizedCategory = categories.find(c => c.name === 'Uncategorized');

    // Build merchant -> category lookup from existing transaction history
    // This is the core of "learn from history" auto-categorization
    const merchantCategoryLookup = await buildMerchantCategoryLookup(userId);

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    let autoCategorized = 0;
    let uncategorized = 0;

    for (const row of rows) {
      try {
        if (!mapping.posted_date || !mapping.description || !mapping.amount) {
          errors++;
          continue;
        }

        const dateStr = row[mapping.posted_date];
        const description = row[mapping.description];
        const amountStr = row[mapping.amount];

        if (!dateStr || !description || !amountStr) {
          errors++;
          continue;
        }

        const posted_date = parseDate(dateStr);
        const amount = parseAmount(amountStr);
        const merchant_key = generateMerchantKey(description);
        const fingerprint_hash = generateTransactionFingerprint({
          posted_date,
          amount,
          description,
          account_id: accountId,
        });

        const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';

        // IGNORE bank categories from CSV - learn from history instead
        // Look up if we've seen this merchant before and know its category
        let category_id = uncategorizedCategory?.id || null;
        let classification_source: 'default' | 'learned' = 'default';
        let classification_confidence = 0.5;

        const normalizedMerchantKey = merchant_key.toLowerCase();
        const historicalCategoryId = merchantCategoryLookup.get(normalizedMerchantKey);

        if (historicalCategoryId) {
          // We've seen this merchant before - use the learned category
          category_id = historicalCategoryId;
          classification_source = 'learned';
          classification_confidence = 0.85;
          autoCategorized++;
        } else {
          // New merchant - leave as uncategorized for user to review
          uncategorized++;
        }

        const { error: insertError } = await (supabase
          .from('transactions')
          .insert as any)({
            user_id: userId,
            account_id: accountId || null,
            upload_id: uploadId,
            posted_date,
            description,
            amount,
            type,
            merchant_key,
            fingerprint_hash,
            category_id,
            classification_source,
            classification_confidence,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            duplicates++;
            // Don't count duplicates in auto/uncategorized stats
            if (historicalCategoryId) {
              autoCategorized--;
            } else {
              uncategorized--;
            }
          } else {
            console.error('Insert error:', insertError);
            errors++;
            // Don't count errors in auto/uncategorized stats
            if (historicalCategoryId) {
              autoCategorized--;
            } else {
              uncategorized--;
            }
          }
        } else {
          imported++;
          // Also add this merchant to lookup for subsequent rows in same import
          if (historicalCategoryId) {
            merchantCategoryLookup.set(normalizedMerchantKey, historicalCategoryId);
          }
        }
      } catch (err) {
        console.error('Row processing error:', err);
        errors++;
      }
    }

    // Still run categorization rules for any transactions left as 'default'
    if (imported > 0) {
      await categorizeTransactions(userId);
    }

    return NextResponse.json({
      imported,
      duplicates,
      errors,
      total: rows.length,
      autoCategorized,
      uncategorized,
    });
  } catch (error) {
    console.error('Import processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process import';
    return NextResponse.json(
      { error: errorMessage, details: error },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function categorizeTransactions(userId: string) {
  const rulesResult = await supabase
    .from('categorization_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  const rules: any[] = rulesResult.data || [];
  if (rules.length === 0) return;

  const transactionsResult = await supabase
    .from('transactions')
    .select('id, merchant_key, amount, category_id')
    .eq('user_id', userId)
    .eq('classification_source', 'default');

  const uncategorizedTransactions: any[] = transactionsResult.data || [];
  if (uncategorizedTransactions.length === 0) return;

  for (const transaction of uncategorizedTransactions) {
    for (const rule of rules) {
      const merchantPattern = (rule.merchant_pattern || '').toLowerCase();
      const merchantKey = (transaction.merchant_key || '').toLowerCase();

      let matches = merchantKey.includes(merchantPattern);

      if (matches && rule.amount_min !== null && Number(transaction.amount) < Number(rule.amount_min)) {
        matches = false;
      }

      if (matches && rule.amount_max !== null && Number(transaction.amount) > Number(rule.amount_max)) {
        matches = false;
      }

      if (matches) {
        await (supabase
          .from('transactions')
          .update as any)({
            category_id: rule.category_id,
            classification_source: 'rule',
            classification_confidence: 0.9,
          })
          .eq('id', transaction.id);

        await (supabase
          .from('categorization_rules')
          .update as any)({ match_count: (rule.match_count || 0) + 1 })
          .eq('id', rule.id);

        break;
      }
    }
  }
}
