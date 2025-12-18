import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
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

        // Fetch all rules for the user with category information
        const { data: rules, error: rulesError } = await supabase
            .from('categorization_rules')
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
            .eq('user_id', userId)
            .order('priority', { ascending: false });

        if (rulesError) {
            throw rulesError;
        }

        return NextResponse.json({ rules: rules || [] });
    } catch (error) {
        console.error('Error fetching rules:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rules' },
            { status: 500 }
        );
    }
}

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
        const body = await request.json();
        const {
            merchant_pattern,
            category_id,
            amount_min,
            amount_max,
            priority,
            apply_to_existing = false
        } = body;

        // Validate required fields
        if (!merchant_pattern || !category_id) {
            return NextResponse.json(
                { error: 'merchant_pattern and category_id are required' },
                { status: 400 }
            );
        }

        // Verify category exists and user has access
        const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', category_id)
            .or(`user_id.eq.${userId},is_system.eq.true`)
            .single();

        if (categoryError || !category) {
            return NextResponse.json(
                { error: 'Invalid category' },
                { status: 400 }
            );
        }

        // Normalize merchant pattern to lowercase for consistent matching
        const normalizedPattern = merchant_pattern.toLowerCase().trim();

        // Check if rule already exists with this pattern
        const { data: existingRule } = await supabase
            .from('categorization_rules')
            .select('id')
            .eq('user_id', userId)
            .eq('merchant_pattern', normalizedPattern)
            .maybeSingle();

        if (existingRule) {
            return NextResponse.json(
                { error: 'A rule with this merchant pattern already exists' },
                { status: 409 }
            );
        }

        // Create the rule
        const { data: newRule, error: createError } = await supabase
            .from('categorization_rules')
            .insert({
                user_id: userId,
                merchant_pattern: normalizedPattern,
                category_id,
                amount_min: amount_min || null,
                amount_max: amount_max || null,
                priority: priority || 100,
                is_active: true,
                match_count: 0
            })
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

        if (createError) {
            throw createError;
        }

        let updatedCount = 0;

        // Optionally apply to existing transactions
        if (apply_to_existing && newRule) {
            // Find all matching transactions that aren't already manually categorized
            const { data: matchingTransactions } = await supabase
                .from('transactions')
                .select('id, merchant_key, amount')
                .eq('user_id', userId)
                .neq('classification_source', 'manual');

            if (matchingTransactions) {
                const transactionsToUpdate = matchingTransactions.filter((t) => {
                    const merchantKey = (t.merchant_key || '').toLowerCase();
                    const amount = Number(t.amount);

                    // Check pattern match
                    if (!merchantKey.includes(normalizedPattern)) {
                        return false;
                    }

                    // Check amount filters if specified
                    if (amount_min !== null && amount < Number(amount_min)) {
                        return false;
                    }

                    if (amount_max !== null && amount > Number(amount_max)) {
                        return false;
                    }

                    return true;
                });

                if (transactionsToUpdate.length > 0) {
                    const transactionIds = transactionsToUpdate.map(t => t.id);

                    const { error: updateError } = await supabase
                        .from('transactions')
                        .update({
                            category_id,
                            classification_source: 'rule',
                            classification_confidence: 0.9,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .in('id', transactionIds);

                    if (!updateError) {
                        updatedCount = transactionsToUpdate.length;

                        // Update rule match count
                        await supabase
                            .from('categorization_rules')
                            .update({ match_count: updatedCount })
                            .eq('id', newRule.id);
                    }
                }
            }
        }

        return NextResponse.json({
            rule: newRule,
            updatedTransactions: updatedCount
        });
    } catch (error) {
        console.error('Error creating rule:', error);
        return NextResponse.json(
            { error: 'Failed to create rule' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
