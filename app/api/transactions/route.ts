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
        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('category_id');

        if (!categoryId) {
            return NextResponse.json({ error: 'category_id is required' }, { status: 400 });
        }

        // Fetch transactions for the category
        const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('category_id', categoryId)
            .order('posted_date', { ascending: false });

        if (transError) {
            throw transError;
        }

        return NextResponse.json({ transactions: transactions || [] });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
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
        const { transactionIds, newCategoryId } = body;

        // Validate required fields
        if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
            return NextResponse.json(
                { error: 'transactionIds array is required' },
                { status: 400 }
            );
        }

        if (!newCategoryId) {
            return NextResponse.json(
                { error: 'newCategoryId is required' },
                { status: 400 }
            );
        }

        // Verify the new category exists and user has access to it
        const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', newCategoryId)
            .or(`user_id.eq.${userId},is_system.eq.true`)
            .single();

        if (categoryError || !category) {
            return NextResponse.json(
                { error: 'Invalid category' },
                { status: 400 }
            );
        }

        // Update transactions
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                category_id: newCategoryId,
                classification_source: 'manual',
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .in('id', transactionIds);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({
            success: true,
            updated: transactionIds.length
        });
    } catch (error) {
        console.error('Error updating transactions:', error);
        return NextResponse.json(
            { error: 'Failed to update transactions' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
