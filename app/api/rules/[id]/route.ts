import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
        const ruleId = params.id;
        const body = await request.json();

        // Verify rule belongs to user
        const { data: existingRule, error: ruleError } = await supabase
            .from('categorization_rules')
            .select('*')
            .eq('id', ruleId)
            .eq('user_id', userId)
            .single();

        if (ruleError || !existingRule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        const {
            merchant_pattern,
            category_id,
            amount_min,
            amount_max,
            priority,
            is_active,
            reapply_to_existing = false
        } = body;

        // Build update object
        const updates: any = {
            updated_at: new Date().toISOString()
        };

        if (merchant_pattern !== undefined) {
            updates.merchant_pattern = merchant_pattern.toLowerCase().trim();
        }

        if (category_id !== undefined) {
            // Verify category exists and user has access
            const { data: category, error: categoryError } = await supabase
                .from('categories')
                .select('id')
                .eq('id', category_id)
                .or(`user_id.eq.${userId},is_system.eq.true`)
                .single();

            if (categoryError || !category) {
                return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
            }
            updates.category_id = category_id;
        }

        if (amount_min !== undefined) {
            updates.amount_min = amount_min;
        }

        if (amount_max !== undefined) {
            updates.amount_max = amount_max;
        }

        if (priority !== undefined) {
            updates.priority = priority;
        }

        if (is_active !== undefined) {
            updates.is_active = is_active;
        }

        // Update the rule
        const { data: updatedRule, error: updateError } = await supabase
            .from('categorization_rules')
            .update(updates)
            .eq('id', ruleId)
            .eq('user_id', userId)
            .select(`
        id,
        priority,
        merchant_pattern,
        category_id,
        amount_min,
        amount_max,
        is_active,
        match_count,
        created_at,
        updated_at,
        categories:category_id (
          id,
          name,
          type,
          color,
          icon
        )
      `)
            .single();

        if (updateError) {
            throw updateError;
        }

        let updatedCount = 0;

        // Optionally reapply to existing transactions
        if (reapply_to_existing && updatedRule) {
            const pattern = updates.merchant_pattern || existingRule.merchant_pattern;
            const targetCategoryId = updates.category_id || existingRule.category_id;
            const minAmount = updates.amount_min ?? existingRule.amount_min;
            const maxAmount = updates.amount_max ?? existingRule.amount_max;

            // Find all matching transactions
            const { data: matchingTransactions } = await supabase
                .from('transactions')
                .select('id, merchant_key, amount')
                .eq('user_id', userId)
                .neq('classification_source', 'manual');

            if (matchingTransactions) {
                const transactionsToUpdate = matchingTransactions.filter((t) => {
                    const merchantKey = (t.merchant_key || '').toLowerCase();
                    const amount = Number(t.amount);

                    if (!merchantKey.includes(pattern.toLowerCase())) {
                        return false;
                    }

                    if (minAmount !== null && amount < Number(minAmount)) {
                        return false;
                    }

                    if (maxAmount !== null && amount > Number(maxAmount)) {
                        return false;
                    }

                    return true;
                });

                if (transactionsToUpdate.length > 0) {
                    const transactionIds = transactionsToUpdate.map(t => t.id);

                    const { error: transUpdateError } = await supabase
                        .from('transactions')
                        .update({
                            category_id: targetCategoryId,
                            classification_source: 'rule',
                            classification_confidence: 0.9,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .in('id', transactionIds);

                    if (!transUpdateError) {
                        updatedCount = transactionsToUpdate.length;

                        // Update match count
                        await supabase
                            .from('categorization_rules')
                            .update({ match_count: (existingRule.match_count || 0) + updatedCount })
                            .eq('id', ruleId);
                    }
                }
            }
        }

        return NextResponse.json({
            rule: updatedRule,
            updatedTransactions: updatedCount
        });
    } catch (error) {
        console.error('Error updating rule:', error);
        return NextResponse.json(
            { error: 'Failed to update rule' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
        const ruleId = params.id;

        // Verify rule belongs to user
        const { data: existingRule, error: ruleError } = await supabase
            .from('categorization_rules')
            .select('*')
            .eq('id', ruleId)
            .eq('user_id', userId)
            .single();

        if (ruleError || !existingRule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        // Delete the rule
        const { error: deleteError } = await supabase
            .from('categorization_rules')
            .delete()
            .eq('id', ruleId)
            .eq('user_id', userId);

        if (deleteError) {
            throw deleteError;
        }

        // Note: We don't reset transactions to uncategorized when deleting a rule
        // because the user may have manually confirmed those categorizations
        // This is a design decision - can be changed if needed

        return NextResponse.json({
            success: true,
            message: 'Rule deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting rule:', error);
        return NextResponse.json(
            { error: 'Failed to delete rule' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
