import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export async function PUT(
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
        const categoryId = params.id;
        const body = await request.json();
        const { name, icon, color } = body;

        // Check if category exists and get its details
        const { data: category, error: fetchError } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .single();

        if (fetchError || !category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // If it's a system category, create/update customization
        if (category.is_system) {
            // Can only customize icon and color for system categories
            const { data: existingCustomization } = await supabase
                .from('category_customizations')
                .select('*')
                .eq('user_id', userId)
                .eq('category_id', categoryId)
                .maybeSingle();

            if (existingCustomization) {
                // Update existing customization
                const { data, error: updateError } = await supabase
                    .from('category_customizations')
                    .update({
                        icon: icon || existingCustomization.icon,
                        color: color || existingCustomization.color,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingCustomization.id)
                    .select()
                    .single();

                if (updateError) {
                    throw updateError;
                }

                return NextResponse.json({ customization: data });
            } else {
                // Create new customization
                const { data, error: createError } = await supabase
                    .from('category_customizations')
                    .insert({
                        user_id: userId,
                        category_id: categoryId,
                        icon: icon || category.icon,
                        color: color || category.color,
                    })
                    .select()
                    .single();

                if (createError) {
                    throw createError;
                }

                return NextResponse.json({ customization: data }, { status: 201 });
            }
        } else {
            // It's a custom category - verify ownership and update directly
            if (category.user_id !== userId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const { data, error: updateError } = await supabase
                .from('categories')
                .update({
                    name: name || category.name,
                    icon: icon || category.icon,
                    color: color || category.color,
                })
                .eq('id', categoryId)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            return NextResponse.json({ category: data });
        }
    } catch (error) {
        console.error('Error updating category:', error);
        return NextResponse.json(
            { error: 'Failed to update category' },
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
        const categoryId = params.id;

        // Check if category exists and get its details
        const { data: category, error: fetchError } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .single();

        if (fetchError || !category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // Cannot delete system categories
        if (category.is_system) {
            return NextResponse.json(
                { error: 'Cannot delete system categories' },
                { status: 403 }
            );
        }

        // Verify ownership
        if (category.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check if category has transactions
        const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('id')
            .eq('category_id', categoryId)
            .limit(1);

        if (transError) {
            throw transError;
        }

        if (transactions && transactions.length > 0) {
            return NextResponse.json(
                { error: 'Cannot delete category with existing transactions. Please reassign transactions first.' },
                { status: 400 }
            );
        }

        // Delete the category
        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json(
            { error: 'Failed to delete category' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
