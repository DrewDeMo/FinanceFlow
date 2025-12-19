import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { differenceInDays, startOfMonth, endOfMonth, getDate } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

interface Transaction {
    merchant_key: string;
    description: string;
    amount: number;
    posted_date: string;
}

interface BillTracking {
    merchant_key: string;
    status: 'active' | 'inactive' | 'paid_this_month';
    typical_due_day: number | null;
    last_paid_date: string | null;
    notes: string | null;
}

interface Bill {
    merchant_key: string;
    merchant_name: string;
    first_payment_date: string;
    last_payment_date: string;
    total_payments: number;
    average_amount: number;
    min_amount: number;
    max_amount: number;
    total_spent: number;
    typical_due_day: number;
    status: 'paid_this_month' | 'due_soon' | 'overdue' | 'upcoming' | 'inactive';
    user_marked_status?: 'active' | 'inactive' | 'paid_this_month';
    days_since_last_payment: number;
    is_variable: boolean;
    notes?: string;
    paid_this_month: boolean;
    last_paid_amount?: number;
}

/**
 * Calculate the most common day of the month from transaction dates
 */
function calculateTypicalDueDay(transactions: Transaction[]): number {
    const dayCounts = new Map<number, number>();

    transactions.forEach(tx => {
        const day = getDate(new Date(tx.posted_date));
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    let mostCommonDay = 1;
    let maxCount = 0;

    dayCounts.forEach((count, day) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommonDay = day;
        }
    });

    return mostCommonDay;
}

/**
 * Determine if bill was paid this month
 */
function wasPaidThisMonth(lastPaymentDate: string): boolean {
    const lastPayment = new Date(lastPaymentDate);
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    return lastPayment >= currentMonthStart && lastPayment <= currentMonthEnd;
}

/**
 * Determine bill status based on payment history and typical due day
 */
function determineBillStatus(
    lastPaymentDate: string,
    typicalDueDay: number,
    daysSinceLastPayment: number,
    userStatus?: string
): 'paid_this_month' | 'due_soon' | 'overdue' | 'upcoming' | 'inactive' {
    // User override
    if (userStatus === 'inactive') {
        return 'inactive';
    }
    if (userStatus === 'paid_this_month') {
        return 'paid_this_month';
    }

    // Check if paid this month
    if (wasPaidThisMonth(lastPaymentDate)) {
        return 'paid_this_month';
    }

    // Calculate expected payment date for this month
    const today = new Date();
    const currentDay = getDate(today);

    // If typical due day has passed and not paid yet
    if (currentDay > typicalDueDay) {
        // If more than 5 days past due
        if (currentDay - typicalDueDay > 5) {
            return 'overdue';
        }
        return 'due_soon';
    }

    // If due day is approaching (within 7 days)
    if (typicalDueDay - currentDay <= 7 && typicalDueDay - currentDay >= 0) {
        return 'due_soon';
    }

    // Bill is upcoming (due later this month)
    return 'upcoming';
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

        // Get the "Bills & Payments" category
        const { data: categories, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', 'Bills & Payments')
            .or(`user_id.eq.${userId},is_system.eq.true`)
            .limit(1)
            .single();

        if (categoryError || !categories) {
            return NextResponse.json({ bills: [] });
        }

        const billsCategoryId = categories.id;

        // Get all transactions categorized as Bills & Payments
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('merchant_key, description, amount, posted_date')
            .eq('user_id', userId)
            .eq('category_id', billsCategoryId)
            .order('posted_date', { ascending: true });

        if (transactionsError) {
            console.error('Error fetching transactions:', transactionsError);
            return NextResponse.json(
                { error: 'Failed to fetch transactions' },
                { status: 500 }
            );
        }

        // Get user's bill tracking data
        const { data: trackingData, error: trackingError } = await supabase
            .from('bill_tracking')
            .select('merchant_key, status, typical_due_day, last_paid_date, notes')
            .eq('user_id', userId);

        if (trackingError) {
            console.error('Error fetching tracking data:', trackingError);
        }

        // Create a map for quick lookup
        const trackingMap = new Map<string, BillTracking>();
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
                min: number;
                max: number;
            }
        >();

        transactions?.forEach((tx) => {
            const key = tx.merchant_key;
            const amount = Math.abs(parseFloat(tx.amount.toString()));

            if (!merchantMap.has(key)) {
                merchantMap.set(key, {
                    merchant_key: key,
                    merchant_name: tx.description,
                    transactions: [],
                    total: 0,
                    min: amount,
                    max: amount,
                });
            }
            const merchant = merchantMap.get(key)!;
            merchant.transactions.push(tx);
            merchant.total += amount;
            merchant.min = Math.min(merchant.min, amount);
            merchant.max = Math.max(merchant.max, amount);
        });

        // Convert to Bill format with all metrics
        const now = new Date();
        const bills: Bill[] = Array.from(merchantMap.values()).map((m) => {
            const firstDate = new Date(m.transactions[0].posted_date);
            const lastDate = new Date(m.transactions[m.transactions.length - 1].posted_date);
            const daysSinceLastPayment = differenceInDays(now, lastDate);
            const lastAmount = Math.abs(parseFloat(m.transactions[m.transactions.length - 1].amount.toString()));

            // Get user tracking data
            const tracking = trackingMap.get(m.merchant_key);

            // Calculate or use user-defined typical due day
            const typicalDueDay = tracking?.typical_due_day || calculateTypicalDueDay(m.transactions);

            // Determine if amount is variable (more than 10% variance)
            const avgAmount = m.total / m.transactions.length;
            const variance = ((m.max - m.min) / avgAmount) * 100;
            const isVariable = variance > 10;

            // Determine status
            const status = determineBillStatus(
                m.transactions[m.transactions.length - 1].posted_date,
                typicalDueDay,
                daysSinceLastPayment,
                tracking?.status
            );

            const paidThisMonth = wasPaidThisMonth(m.transactions[m.transactions.length - 1].posted_date);

            return {
                merchant_key: m.merchant_key,
                merchant_name: m.merchant_name,
                first_payment_date: m.transactions[0].posted_date,
                last_payment_date: m.transactions[m.transactions.length - 1].posted_date,
                total_payments: m.transactions.length,
                average_amount: avgAmount,
                min_amount: m.min,
                max_amount: m.max,
                total_spent: m.total,
                typical_due_day: typicalDueDay,
                status,
                user_marked_status: tracking?.status as any,
                days_since_last_payment: daysSinceLastPayment,
                is_variable: isVariable,
                notes: tracking?.notes || undefined,
                paid_this_month: paidThisMonth,
                last_paid_amount: paidThisMonth ? lastAmount : undefined,
            };
        });

        // Sort by status priority (overdue, due soon, upcoming, paid, inactive)
        const statusPriority = {
            overdue: 1,
            due_soon: 2,
            upcoming: 3,
            paid_this_month: 4,
            inactive: 5,
        };

        bills.sort((a, b) => {
            const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
            if (priorityDiff !== 0) return priorityDiff;
            // Within same status, sort by typical due day
            return a.typical_due_day - b.typical_due_day;
        });

        return NextResponse.json({ bills });
    } catch (error) {
        console.error('Error in bills API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
