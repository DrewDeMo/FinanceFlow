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

        const body = await request.json();
        const { merchant_key, status, notes, typical_due_day } = body;

        if (!merchant_key || !status) {
            return NextResponse.json(
                { error: 'merchant_key and status are required' },
                { status: 400 }
            );
        }

        // Validate status
        if (!['active', 'inactive', 'paid_this_month'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be active, inactive, or paid_this_month' },
                { status: 400 }
            );
        }

        const userId = user.id;

        // Prepare the update data
        const updateData: any = {
            user_id: userId,
            merchant_key,
            status,
            updated_at: new Date().toISOString(),
        };

        // Add optional fields if provided
        if (notes !== undefined) {
            updateData.notes = notes || null;
        }

        if (typical_due_day !== undefined) {
            if (typical_due_day !== null && (typical_due_day < 1 || typical_due_day > 31)) {
                return NextResponse.json(
                    { error: 'typical_due_day must be between 1 and 31' },
                    { status: 400 }
                );
            }
            updateData.typical_due_day = typical_due_day;
        }

        // Update last_paid_date if marking as paid
        if (status === 'paid_this_month') {
            updateData.last_paid_date = new Date().toISOString().split('T')[0];
        }

        // Upsert the bill tracking record
        const { error: upsertError } = await supabase
            .from('bill_tracking')
            .upsert(updateData, {
                onConflict: 'user_id,merchant_key',
            });

        if (upsertError) {
            console.error('Error upserting bill tracking:', upsertError);
            return NextResponse.json(
                { error: 'Failed to update bill status' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in bill status API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
