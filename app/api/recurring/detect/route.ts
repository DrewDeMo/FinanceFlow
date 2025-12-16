import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { detectRecurringCharges } from '@/lib/utils/recurring-detector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const transactionsResult = await supabase
      .from('transactions')
      .select('id, posted_date, description, amount, merchant_key')
      .eq('user_id', userId)
      .order('posted_date', { ascending: true });

    if (transactionsResult.error || !transactionsResult.data) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    const patterns = detectRecurringCharges(transactionsResult.data);

    let inserted = 0;
    let updated = 0;

    for (const pattern of patterns) {
      const existingResult = await supabase
        .from('recurring_series')
        .select('id, occurrence_count')
        .eq('user_id', userId)
        .eq('merchant_key', pattern.merchant_key)
        .maybeSingle();

      if (existingResult.data) {
        const existing = existingResult.data as { id: string; occurrence_count: number };
        if (pattern.occurrence_count > existing.occurrence_count) {
          await (supabase
            .from('recurring_series')
            .update as any)({
              cadence: pattern.cadence,
              average_amount: pattern.average_amount,
              last_amount: pattern.last_amount,
              amount_variance: pattern.amount_variance,
              confidence: pattern.confidence,
              occurrence_count: pattern.occurrence_count,
              last_occurrence_date: pattern.last_occurrence_date,
              next_expected_date: pattern.next_expected_date,
              is_variable: pattern.is_variable,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          updated++;
        }
      } else {
        await (supabase
          .from('recurring_series')
          .insert as any)({
            user_id: userId,
            merchant_key: pattern.merchant_key,
            merchant_name: pattern.merchant_name,
            cadence: pattern.cadence,
            average_amount: pattern.average_amount,
            last_amount: pattern.last_amount,
            amount_variance: pattern.amount_variance,
            confidence: pattern.confidence,
            status: 'pending_confirmation',
            occurrence_count: pattern.occurrence_count,
            last_occurrence_date: pattern.last_occurrence_date,
            next_expected_date: pattern.next_expected_date,
            is_variable: pattern.is_variable,
          });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      detected: patterns.length,
      inserted,
      updated,
    });
  } catch (error) {
    console.error('Error detecting recurring charges:', error);
    return NextResponse.json(
      { error: 'Failed to detect recurring charges' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
