import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startOfMonth, endOfMonth, format, eachDayOfInterval, parseISO } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface DayData {
    date: string;
    income: number;
    expenses: number;
    netCashflow: number;
    transactionCount: number;
    transactions: Array<{
        id: string;
        description: string;
        amount: number;
        merchant_key: string;
        category?: {
            name: string;
            color: string;
            icon: string;
        };
    }>;
    bills: Array<{
        merchant_key: string;
        merchant_name: string;
        typical_amount: number;
        status: string;
        paid_this_month: boolean;
    }>;
    hasNote: boolean;
    note?: {
        id: string;
        content: string;
    };
}

interface MonthSummary {
    totalIncome: number;
    totalExpenses: number;
    netCashflow: number;
    totalTransactions: number;
    billsDue: number;
    billsPaid: number;
    highestSpendingDay: string | null;
    highestSpendingAmount: number;
    averageDailySpending: number;
}

export async function GET(request: NextRequest) {
    try {
        // Get auth token from header
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');

        // Create Supabase client with service role
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify the token and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get month/year from query params (default to current month)
        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

        // Calculate date range
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(new Date(year, month - 1));
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');

        // Fetch transactions for the month
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select(`
        id,
        posted_date,
        description,
        amount,
        merchant_key,
        category_id,
        categories:category_id (name, color, icon)
      `)
            .eq('user_id', user.id)
            .gte('posted_date', startDateStr)
            .lte('posted_date', endDateStr)
            .order('posted_date', { ascending: true });

        if (txError) {
            console.error('Error fetching transactions:', txError);
            return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
        }

        // Fetch bills for the month
        const { data: billsData, error: billsError } = await supabase
            .from('bill_tracking')
            .select('*')
            .eq('user_id', user.id);

        if (billsError) {
            console.error('Error fetching bills:', billsError);
        }

        // Fetch calendar notes for the month
        const { data: notes, error: notesError } = await supabase
            .from('calendar_notes')
            .select('*')
            .eq('user_id', user.id)
            .gte('note_date', startDateStr)
            .lte('note_date', endDateStr);

        if (notesError) {
            console.error('Error fetching notes:', notesError);
        }

        // Also fetch bills from the bills category transactions to show due dates
        const { data: billTransactions, error: billTxError } = await supabase
            .from('transactions')
            .select(`
        merchant_key,
        amount,
        posted_date,
        categories:category_id (name)
      `)
            .eq('user_id', user.id)
            .not('category_id', 'is', null);

        // Get unique bills from transactions categorized as "Bills & Payments"
        const billMerchants = new Map<string, {
            merchant_key: string;
            merchant_name: string;
            typical_amount: number;
            typical_due_day: number;
            last_payment_date: string;
        }>();

        billTransactions?.forEach((tx: any) => {
            const category = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
            if (category?.name === 'Bills & Payments') {
                const existing = billMerchants.get(tx.merchant_key);
                const txDate = new Date(tx.posted_date);
                if (!existing || new Date(existing.last_payment_date) < txDate) {
                    billMerchants.set(tx.merchant_key, {
                        merchant_key: tx.merchant_key,
                        merchant_name: tx.merchant_key.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                        typical_amount: Math.abs(tx.amount),
                        typical_due_day: txDate.getDate(),
                        last_payment_date: tx.posted_date,
                    });
                }
            }
        });

        // Create a map for quick note lookup
        const notesMap = new Map<string, { id: string; content: string }>();
        notes?.forEach((note: any) => {
            notesMap.set(note.note_date, { id: note.id, content: note.content });
        });

        // Create a map for bill tracking status
        const billTrackingMap = new Map<string, any>();
        billsData?.forEach((bt: any) => {
            billTrackingMap.set(bt.merchant_key, bt);
        });

        // Initialize day data for each day in the month
        const days: Record<string, DayData> = {};
        const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

        daysInMonth.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const note = notesMap.get(dateStr);

            // Check for bills due on this day
            const dayOfMonth = day.getDate();
            const billsForDay: DayData['bills'] = [];

            billMerchants.forEach((bill) => {
                if (bill.typical_due_day === dayOfMonth) {
                    const tracking = billTrackingMap.get(bill.merchant_key);
                    const currentMonth = format(new Date(), 'yyyy-MM');
                    const lastPaymentMonth = bill.last_payment_date ? format(new Date(bill.last_payment_date), 'yyyy-MM') : null;
                    const paidThisMonth = tracking?.status === 'paid_this_month' ||
                        (lastPaymentMonth === format(new Date(year, month - 1), 'yyyy-MM'));

                    billsForDay.push({
                        merchant_key: bill.merchant_key,
                        merchant_name: bill.merchant_name,
                        typical_amount: bill.typical_amount,
                        status: tracking?.status || 'active',
                        paid_this_month: paidThisMonth,
                    });
                }
            });

            days[dateStr] = {
                date: dateStr,
                income: 0,
                expenses: 0,
                netCashflow: 0,
                transactionCount: 0,
                transactions: [],
                bills: billsForDay,
                hasNote: !!note,
                note: note || undefined,
            };
        });

        // Aggregate transaction data by day
        let totalIncome = 0;
        let totalExpenses = 0;
        let highestSpendingDay: string | null = null;
        let highestSpendingAmount = 0;

        transactions?.forEach((tx: any) => {
            const dateStr = tx.posted_date;
            const amount = Number(tx.amount);
            const category = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;

            if (days[dateStr]) {
                days[dateStr].transactionCount += 1;
                days[dateStr].transactions.push({
                    id: tx.id,
                    description: tx.description,
                    amount: amount,
                    merchant_key: tx.merchant_key,
                    category: category ? {
                        name: category.name,
                        color: category.color,
                        icon: category.icon,
                    } : undefined,
                });

                if (amount > 0) {
                    days[dateStr].income += amount;
                    totalIncome += amount;
                } else {
                    days[dateStr].expenses += Math.abs(amount);
                    totalExpenses += Math.abs(amount);

                    // Track highest spending day
                    if (days[dateStr].expenses > highestSpendingAmount) {
                        highestSpendingAmount = days[dateStr].expenses;
                        highestSpendingDay = dateStr;
                    }
                }

                days[dateStr].netCashflow = days[dateStr].income - days[dateStr].expenses;
            }
        });

        // Calculate bills summary
        let billsDue = 0;
        let billsPaid = 0;
        Object.values(days).forEach(day => {
            day.bills.forEach(bill => {
                if (bill.paid_this_month) {
                    billsPaid++;
                } else {
                    billsDue++;
                }
            });
        });

        // Calculate spending intensity thresholds
        const expenseValues = Object.values(days)
            .map(d => d.expenses)
            .filter(e => e > 0)
            .sort((a, b) => a - b);

        const daysWithSpending = expenseValues.length;
        const averageDailySpending = daysWithSpending > 0
            ? expenseValues.reduce((a, b) => a + b, 0) / daysWithSpending
            : 0;

        const summary: MonthSummary = {
            totalIncome,
            totalExpenses,
            netCashflow: totalIncome - totalExpenses,
            totalTransactions: transactions?.length || 0,
            billsDue,
            billsPaid,
            highestSpendingDay,
            highestSpendingAmount,
            averageDailySpending,
        };

        return NextResponse.json({
            days,
            summary,
            month: {
                year,
                month,
                startDate: startDateStr,
                endDate: endDateStr,
            },
        });
    } catch (error) {
        console.error('Calendar API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
