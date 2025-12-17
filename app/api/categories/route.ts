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

        // Fetch all categories (system + user's custom)
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .or(`user_id.eq.${userId},is_system.eq.true`)
            .order('name');

        if (categoriesError) {
            throw categoriesError;
        }

        // Fetch user's customizations
        const { data: customizations, error: customError } = await supabase
            .from('category_customizations')
            .select('*')
            .eq('user_id', userId);

        if (customError) {
            throw customError;
        }

        // Fetch transaction counts and totals
        const { data: transactionStats, error: statsError } = await supabase
            .from('transactions')
            .select('category_id, amount')
            .eq('user_id', userId);

        if (statsError) {
            console.error('Error fetching transaction stats:', statsError);
            throw statsError;
        }

        console.log(`Found ${transactionStats?.length || 0} transactions for user ${userId}`);

        // Calculate stats per category
        const statsMap = new Map<string, { count: number; total: number }>();
        transactionStats?.forEach((t) => {
            if (t.category_id) {
                const existing = statsMap.get(t.category_id) || { count: 0, total: 0 };
                statsMap.set(t.category_id, {
                    count: existing.count + 1,
                    total: existing.total + Number(t.amount || 0),
                });
            }
        });

        console.log(`Stats calculated for ${statsMap.size} categories`);

        // Merge categories with customizations and stats
        const customizationsMap = new Map(
            customizations?.map((c) => [c.category_id, c]) || []
        );

        const mergedCategories = categories?.map((category) => {
            const customization = customizationsMap.get(category.id);
            const stats = statsMap.get(category.id) || { count: 0, total: 0 };

            return {
                id: category.id,
                user_id: category.user_id,
                name: category.name,
                type: category.type,
                icon: customization?.icon || category.icon,
                color: customization?.color || category.color,
                is_system: category.is_system,
                created_at: category.created_at,
                transaction_count: stats.count,
                total_amount: stats.total,
                has_customization: !!customization,
                customization_id: customization?.id || null,
            };
        }) || [];

        return NextResponse.json({ categories: mergedCategories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
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
        const { name, type, icon, color } = body;

        // Validate required fields
        if (!name || !type) {
            return NextResponse.json(
                { error: 'Name and type are required' },
                { status: 400 }
            );
        }

        // Create new custom category
        const { data: newCategory, error: createError } = await supabase
            .from('categories')
            .insert({
                user_id: userId,
                name,
                type,
                icon: icon || 'circle',
                color: color || '#6B7280',
                is_system: false,
            })
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        return NextResponse.json({ category: newCategory }, { status: 201 });
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json(
            { error: 'Failed to create category' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
