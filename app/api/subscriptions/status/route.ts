import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

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
        const { merchant_key, status, notes } = body;

        // Validate input
        if (!merchant_key || !status) {
            return NextResponse.json(
                { error: 'merchant_key and status are required' },
                { status: 400 }
            );
        }

        if (!['active', 'cancelled'].includes(status)) {
            return NextResponse.json(
                { error: 'status must be either "active" or "cancelled"' },
                { status: 400 }
            );
        }

        // Check if tracking record exists
        const { data: existing } = await supabase
            .from('subscription_tracking')
            .select('id')
            .eq('user_id', userId)
            .eq('merchant_key', merchant_key)
            .single();

        const now = new Date().toISOString();
        const updateData = {
            user_id: userId,
            merchant_key,
            status,
            cancelled_date: status === 'cancelled' ? now : null,
            notes: notes || null,
            updated_at: now,
        };

        if (existing) {
            // Update existing record
            const { error: updateError } = await supabase
                .from('subscription_tracking')
                .update(updateData)
                .eq('id', existing.id);

            if (updateError) {
                console.error('Error updating subscription tracking:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update subscription status' },
                    { status: 500 }
                );
            }
        } else {
            // Insert new record
            const { error: insertError } = await supabase
                .from('subscription_tracking')
                .insert(updateData);

            if (insertError) {
                console.error('Error inserting subscription tracking:', insertError);
                return NextResponse.json(
                    { error: 'Failed to create subscription status' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: `Subscription marked as ${status}`,
        });
    } catch (error) {
        console.error('Error in subscription status API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
