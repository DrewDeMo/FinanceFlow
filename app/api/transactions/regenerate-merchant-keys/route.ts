import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { generateMerchantKey } from '@/lib/utils/merchant';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

/**
 * Regenerate merchant_keys for all transactions using the improved normalization logic.
 * This is a one-time migration to fix existing transactions.
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        // Fetch all transactions for this user
        const { data: transactions, error: fetchError } = await supabase
            .from('transactions')
            .select('id, description, merchant_key')
            .eq('user_id', userId);

        if (fetchError) {
            throw fetchError;
        }

        if (!transactions || transactions.length === 0) {
            return NextResponse.json({
                success: true,
                updated: 0,
                message: 'No transactions to update'
            });
        }

        let updated = 0;
        let unchanged = 0;
        const batchSize = 100;
        const updates = [];

        // Process transactions and collect those that need updating
        for (const transaction of transactions) {
            const newMerchantKey = generateMerchantKey(transaction.description);

            if (newMerchantKey !== transaction.merchant_key) {
                updates.push({
                    id: transaction.id,
                    merchant_key: newMerchantKey
                });
            } else {
                unchanged++;
            }
        }

        // Update in batches
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);

            // Update each transaction in the batch
            for (const update of batch) {
                const { error: updateError } = await supabase
                    .from('transactions')
                    .update({ merchant_key: update.merchant_key })
                    .eq('id', update.id)
                    .eq('user_id', userId);

                if (!updateError) {
                    updated++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            total: transactions.length,
            updated,
            unchanged,
            message: `Regenerated merchant keys for ${updated} transactions. ${unchanged} were already correct.`
        });
    } catch (error) {
        console.error('Error regenerating merchant keys:', error);
        return NextResponse.json(
            { error: 'Failed to regenerate merchant keys' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
