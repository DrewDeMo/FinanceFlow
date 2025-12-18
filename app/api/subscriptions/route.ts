import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { differenceInDays } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

interface Transaction {
    merchant_key: string;
    description: string;
    amount: number;
    posted_date: string;
}

interface SubscriptionTracking {
    merchant_key: string;
    status: 'active' | 'cancelled';
    cancelled_date: string | null;
    notes: string | null;
}

interface Subscription {
    merchant_key: string;
    merchant_name: string;
    first_charge_date: string;
    last_charge_date: string;
    total_charges: number;
    average_amount: number;
    total_spent: number;
    status: 'active' | 'cancelled' | 'potentially_inactive';
    user_marked_status?: 'active' | 'cancelled';
    cancelled_date?: string;
    days_since_last_charge: number;
    is_ongoing: boolean;
    notes?: string;
}

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

        // Get the Subscriptions category
        const { data: categories, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', 'Subscriptions')
            .or(`user_id.eq.${userId},is_system.eq.true`)
            .limit(1)
            .single();

        if (categoryError || !categories) {
            return NextResponse.json({ subscriptions: [] });
        }

        const subscriptionCategoryId = categories.id;

        // Get all transactions categorized as Subscriptions
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('merchant_key, description, amount, posted_date')
            .eq('user_id', userId)
            .eq('category_id', subscriptionCategoryId)
            .order('posted_date', { ascending: true });

        if (transactionsError) {
            console.error('Error fetching transactions:', transactionsError);
            return NextResponse.json(
                { error: 'Failed to fetch transactions' },
                { status: 500 }
            );
        }

        // Get user's subscription tracking data
        const { data: trackingData, error: trackingError } = await supabase
            .from('subscription_tracking')
            .select('merchant_key, status, cancelled_date, notes')
            .eq('user_id', userId);

        if (trackingError) {
            console.error('Error fetching tracking data:', trackingError);
        }

        // Create a map for quick lookup
        const trackingMap = new Map<string, SubscriptionTracking>();
        trackingData?.forEach((t) => {
            trackingMap.set(t.merchant_key, t);
        });

        // Group transactions by merchant_key and calculate metrics
        const merchantMap = new Map<
            string,
            {
                merchant_key: string;
                merchant_name: string;
                transactions: Transaction[];
                total: number;
            }
        >();

        transactions?.forEach((tx) => {
            const key = tx.merchant_key;
            if (!merchantMap.has(key)) {
                merchantMap.set(key, {
                    merchant_key: key,
                    merchant_name: tx.description,
                    transactions: [],
                    total: 0,
                });
            }
            const merchant = merchantMap.get(key)!;
            merchant.transactions.push(tx);
            merchant.total += Math.abs(parseFloat(tx.amount.toString()));
        });

        // Convert to Subscription format with all metrics
        const now = new Date();
        const subscriptions: Subscription[] = Array.from(merchantMap.values()).map(
            (m) => {
                const firstDate = new Date(m.transactions[0].posted_date);
                const lastDate = new Date(
                    m.transactions[m.transactions.length - 1].posted_date
                );
                const daysSinceLastCharge = differenceInDays(now, lastDate);

                // Get user tracking status
                const tracking = trackingMap.get(m.merchant_key);

                // Determine status
                let status: 'active' | 'cancelled' | 'potentially_inactive';
                let isOngoing = true;

                if (tracking?.status === 'cancelled') {
                    status = 'cancelled';
                    isOngoing = false;
                } else if (daysSinceLastCharge > 60 && tracking?.status !== 'active') {
                    status = 'potentially_inactive';
                    isOngoing = false;
                } else {
                    status = 'active';
                    isOngoing = true;
                }

                return {
                    merchant_key: m.merchant_key,
                    merchant_name: m.merchant_name,
                    first_charge_date: m.transactions[0].posted_date,
                    last_charge_date:
                        m.transactions[m.transactions.length - 1].posted_date,
                    total_charges: m.transactions.length,
                    average_amount: m.total / m.transactions.length,
                    total_spent: m.total,
                    status,
                    user_marked_status: tracking?.status,
                    cancelled_date: tracking?.cancelled_date || undefined,
                    days_since_last_charge: daysSinceLastCharge,
                    is_ongoing: isOngoing,
                    notes: tracking?.notes || undefined,
                };
            }
        );

        // Sort by last charge date (most recent first)
        subscriptions.sort(
            (a, b) =>
                new Date(b.last_charge_date).getTime() -
                new Date(a.last_charge_date).getTime()
        );

        return NextResponse.json({ subscriptions });
    } catch (error) {
        console.error('Error in subscriptions API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
