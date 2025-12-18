import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get user from auth header
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Query all December transactions
        const { data: allTransactions, error: allError } = await supabase
            .from('transactions')
            .select('id, posted_date, description, amount, account_id')
            .eq('user_id', user.id)
            .gte('posted_date', '2025-12-01')
            .lte('posted_date', '2025-12-31')
            .order('posted_date', { ascending: true });

        if (allError) {
            return NextResponse.json({ error: allError.message }, { status: 500 });
        }

        // Calculate totals
        let totalIncome = 0;
        let totalExpenses = 0;
        let incomeCount = 0;
        let expenseCount = 0;

        const byDate: Record<string, { income: number; expenses: number; count: number }> = {};
        const byAccount: Record<string, { income: number; expenses: number; count: number; name: string }> = {};

        allTransactions?.forEach((t: any) => {
            const amount = Number(t.amount);
            const date = t.posted_date;
            const accountId = t.account_id || 'unknown';

            // Initialize date tracking
            if (!byDate[date]) {
                byDate[date] = { income: 0, expenses: 0, count: 0 };
            }

            // Initialize account tracking
            if (!byAccount[accountId]) {
                byAccount[accountId] = { income: 0, expenses: 0, count: 0, name: accountId };
            }

            if (amount > 0) {
                totalIncome += amount;
                incomeCount++;
                byDate[date].income += amount;
                byAccount[accountId].income += amount;
            } else if (amount < 0) {
                totalExpenses += Math.abs(amount);
                expenseCount++;
                byDate[date].expenses += Math.abs(amount);
                byAccount[accountId].expenses += Math.abs(amount);
            }

            byDate[date].count++;
            byAccount[accountId].count++;
        });

        // Get account names
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id, name')
            .eq('user_id', user.id);

        accounts?.forEach(acc => {
            if (byAccount[acc.id]) {
                byAccount[acc.id].name = acc.name;
            }
        });

        // Find transactions with future dates or suspicious amounts
        const today = '2024-12-18';
        const futureTransactions = allTransactions?.filter(t => t.posted_date > today) || [];
        const largeExpenses = allTransactions?.filter(t => Number(t.amount) < -1000) || [];

        return NextResponse.json({
            summary: {
                totalTransactions: allTransactions?.length || 0,
                incomeCount,
                expenseCount,
                totalIncome: totalIncome.toFixed(2),
                totalExpenses: totalExpenses.toFixed(2),
                netCashflow: (totalIncome - totalExpenses).toFixed(2),
            },
            byDate: Object.entries(byDate).map(([date, data]) => ({
                date,
                income: data.income.toFixed(2),
                expenses: data.expenses.toFixed(2),
                count: data.count,
            })),
            byAccount: Object.entries(byAccount).map(([id, data]) => ({
                accountId: id,
                accountName: data.name,
                income: data.income.toFixed(2),
                expenses: data.expenses.toFixed(2),
                netChange: (data.income - data.expenses).toFixed(2),
                count: data.count,
            })),
            warnings: {
                futureTransactionsCount: futureTransactions.length,
                futureTransactions: futureTransactions.slice(0, 10).map(t => ({
                    date: t.posted_date,
                    description: t.description,
                    amount: t.amount,
                })),
                largeExpensesCount: largeExpenses.length,
                largeExpenses: largeExpenses.slice(0, 10).map(t => ({
                    date: t.posted_date,
                    description: t.description,
                    amount: t.amount,
                })),
            },
            sampleTransactions: allTransactions?.slice(0, 20).map(t => ({
                date: t.posted_date,
                description: t.description,
                amount: t.amount,
            })),
        });
    } catch (error: any) {
        console.error('Debug API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
