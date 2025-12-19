import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export interface TransactionDetail {
    date: string;
    description: string;
    merchantKey: string;
    amount: number;
    category: string;
    categoryId: string;
    categoryType: string;
}

export interface FinancialSummary {
    period: string;
    totalIncome: number;
    totalExpenses: number;
    netCashflow: number;
    transactionCount: number;
    categoryBreakdown: CategorySummary[];
    topMerchants: MerchantSummary[];
    recurringCharges: RecurringSummary;
    comparisonToPrevious: ComparisonData | null;
    recentTransactions: TransactionDetail[];
    allTransactions: TransactionDetail[];
}

export interface CategorySummary {
    id: string;
    name: string;
    type: string;
    amount: number;
    transactionCount: number;
    percentOfTotal: number;
}

export interface MerchantSummary {
    merchantKey: string;
    totalSpent: number;
    transactionCount: number;
}

export interface RecurringSummary {
    activeSubscriptions: number;
    totalMonthlyRecurring: number;
    subscriptions: {
        name: string;
        amount: number;
        status: string;
    }[];
}

export interface ComparisonData {
    previousPeriod: string;
    incomeChange: number;
    expenseChange: number;
    incomeChangePercent: number;
    expenseChangePercent: number;
}

export type ContextType = 'monthly' | 'yearly' | 'custom';

export async function buildFinancialContext(
    userId: string,
    contextType: ContextType = 'monthly',
    customStartDate?: Date,
    customEndDate?: Date
): Promise<FinancialSummary> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;
    let previousStartDate: Date | null = null;
    let previousEndDate: Date | null = null;

    switch (contextType) {
        case 'monthly':
            startDate = startOfMonth(now);
            endDate = now;
            periodLabel = format(now, 'MMMM yyyy');
            previousStartDate = startOfMonth(subMonths(now, 1));
            previousEndDate = endOfMonth(subMonths(now, 1));
            break;
        case 'yearly':
            startDate = startOfMonth(subMonths(now, 11));
            endDate = now;
            periodLabel = `Last 12 months (${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')})`;
            break;
        case 'custom':
            startDate = customStartDate || startOfMonth(now);
            endDate = customEndDate || now;
            periodLabel = `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
            break;
        default:
            startDate = startOfMonth(now);
            endDate = now;
            periodLabel = format(now, 'MMMM yyyy');
    }

    // Fetch transactions for the period with full details
    const { data: transactions } = await supabase
        .from('transactions')
        .select(`
      amount,
      posted_date,
      description,
      merchant_key,
      category_id,
      categories:category_id (name, type)
    `)
        .eq('user_id', userId)
        .gte('posted_date', format(startDate, 'yyyy-MM-dd'))
        .lte('posted_date', format(endDate, 'yyyy-MM-dd'))
        .order('posted_date', { ascending: false });

    // Calculate totals and build transaction details
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryMap = new Map<string, CategorySummary>();
    const merchantMap = new Map<string, MerchantSummary>();
    const allTransactions: TransactionDetail[] = [];

    transactions?.forEach((t: any) => {
        const amount = Number(t.amount);
        const category = Array.isArray(t.categories) ? t.categories[0] : t.categories;
        const categoryId = t.category_id || 'uncategorized';
        const categoryName = category?.name || 'Uncategorized';
        const categoryType = category?.type || 'expense';
        const isTransfer = categoryType === 'transfer';

        // Add to all transactions list with full details
        allTransactions.push({
            date: t.posted_date,
            description: t.description || '',
            merchantKey: t.merchant_key || '',
            amount: amount,
            category: categoryName,
            categoryId: categoryId,
            categoryType: categoryType,
        });

        if (!isTransfer) {
            if (amount > 0) {
                totalIncome += amount;
            } else {
                totalExpenses += Math.abs(amount);
            }
        }

        // Category breakdown (expenses only) - use category_id for accurate grouping
        if (!isTransfer && amount < 0) {
            const existing = categoryMap.get(categoryId);
            if (existing) {
                existing.amount += Math.abs(amount);
                existing.transactionCount += 1;
            } else {
                categoryMap.set(categoryId, {
                    id: categoryId,
                    name: categoryName,
                    type: categoryType,
                    amount: Math.abs(amount),
                    transactionCount: 1,
                    percentOfTotal: 0,
                });
            }
        }

        // Merchant breakdown (expenses only)
        if (amount < 0 && t.merchant_key) {
            const existing = merchantMap.get(t.merchant_key);
            if (existing) {
                existing.totalSpent += Math.abs(amount);
                existing.transactionCount += 1;
            } else {
                merchantMap.set(t.merchant_key, {
                    merchantKey: t.merchant_key,
                    totalSpent: Math.abs(amount),
                    transactionCount: 1,
                });
            }
        }
    });

    // Calculate percentages and sort categories
    const categoryBreakdown = Array.from(categoryMap.values())
        .map(c => ({
            ...c,
            percentOfTotal: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    // Sort merchants by spending
    const topMerchants = Array.from(merchantMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

    // Fetch recurring charges
    const { data: recurring } = await supabase
        .from('recurring_series')
        .select('merchant_name, average_amount, status, is_subscription')
        .eq('user_id', userId)
        .eq('status', 'active');

    const recurringCharges: RecurringSummary = {
        activeSubscriptions: recurring?.filter(r => r.is_subscription).length || 0,
        totalMonthlyRecurring: recurring?.reduce((sum, r) => sum + Number(r.average_amount), 0) || 0,
        subscriptions: recurring?.map(r => ({
            name: r.merchant_name,
            amount: Number(r.average_amount),
            status: r.status || 'active',
        })) || [],
    };

    // Fetch comparison data for monthly context
    let comparisonToPrevious: ComparisonData | null = null;
    if (previousStartDate && previousEndDate) {
        const { data: prevTransactions } = await supabase
            .from('transactions')
            .select(`
        amount,
        categories:category_id (type)
      `)
            .eq('user_id', userId)
            .gte('posted_date', format(previousStartDate, 'yyyy-MM-dd'))
            .lte('posted_date', format(previousEndDate, 'yyyy-MM-dd'));

        let prevIncome = 0;
        let prevExpenses = 0;

        prevTransactions?.forEach((t: any) => {
            const amount = Number(t.amount);
            const category = Array.isArray(t.categories) ? t.categories[0] : t.categories;
            const isTransfer = category?.type === 'transfer';

            if (!isTransfer) {
                if (amount > 0) {
                    prevIncome += amount;
                } else {
                    prevExpenses += Math.abs(amount);
                }
            }
        });

        if (prevIncome > 0 || prevExpenses > 0) {
            comparisonToPrevious = {
                previousPeriod: format(previousStartDate, 'MMMM yyyy'),
                incomeChange: totalIncome - prevIncome,
                expenseChange: totalExpenses - prevExpenses,
                incomeChangePercent: prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : 0,
                expenseChangePercent: prevExpenses > 0 ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100) : 0,
            };
        }
    }

    // Get recent transactions (last 50) and all transactions for detailed analysis
    const recentTransactions = allTransactions.slice(0, 50);

    return {
        period: periodLabel,
        totalIncome,
        totalExpenses,
        netCashflow: totalIncome - totalExpenses,
        transactionCount: transactions?.length || 0,
        categoryBreakdown,
        topMerchants,
        recurringCharges,
        comparisonToPrevious,
        recentTransactions,
        allTransactions,
    };
}

export function formatFinancialContextForAI(summary: FinancialSummary): string {
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    let context = `### Financial Overview for ${summary.period}\n\n`;

    context += `**Summary:**\n`;
    context += `- Total Income: ${formatCurrency(summary.totalIncome)}\n`;
    context += `- Total Expenses: ${formatCurrency(summary.totalExpenses)}\n`;
    context += `- Net Cashflow: ${formatCurrency(summary.netCashflow)} (${summary.netCashflow >= 0 ? 'positive' : 'negative'})\n`;
    context += `- Total Transactions: ${summary.transactionCount}\n\n`;

    if (summary.comparisonToPrevious) {
        context += `**Compared to ${summary.comparisonToPrevious.previousPeriod}:**\n`;
        context += `- Income: ${summary.comparisonToPrevious.incomeChange >= 0 ? '+' : ''}${formatCurrency(summary.comparisonToPrevious.incomeChange)} (${summary.comparisonToPrevious.incomeChangePercent >= 0 ? '+' : ''}${summary.comparisonToPrevious.incomeChangePercent}%)\n`;
        context += `- Expenses: ${summary.comparisonToPrevious.expenseChange >= 0 ? '+' : ''}${formatCurrency(summary.comparisonToPrevious.expenseChange)} (${summary.comparisonToPrevious.expenseChangePercent >= 0 ? '+' : ''}${summary.comparisonToPrevious.expenseChangePercent}%)\n\n`;
    }

    if (summary.categoryBreakdown.length > 0) {
        context += `**Spending by Category (Top 10):**\n`;
        context += `IMPORTANT: These are pre-calculated totals. Use these exact figures when answering questions about category spending.\n`;
        summary.categoryBreakdown.forEach(cat => {
            context += `- ${cat.name}: TOTAL=${formatCurrency(cat.amount)}, ${cat.transactionCount} transactions, ${cat.percentOfTotal}% of spending\n`;
        });
        context += '\n';
    }

    if (summary.topMerchants.length > 0) {
        context += `**Top Merchants by Spending:**\n`;
        summary.topMerchants.slice(0, 5).forEach(merchant => {
            context += `- ${merchant.merchantKey}: ${formatCurrency(merchant.totalSpent)} (${merchant.transactionCount} transactions)\n`;
        });
        context += '\n';
    }

    if (summary.recurringCharges.subscriptions.length > 0) {
        context += `**Active Recurring Charges:**\n`;
        context += `- Total monthly recurring: ${formatCurrency(summary.recurringCharges.totalMonthlyRecurring)}\n`;
        context += `- Active subscriptions: ${summary.recurringCharges.activeSubscriptions}\n`;
        context += `- Breakdown:\n`;
        summary.recurringCharges.subscriptions.forEach(sub => {
            context += `  - ${sub.name}: ${formatCurrency(sub.amount)}/month\n`;
        });
        context += '\n';
    }

    // Add individual transaction details
    if (summary.allTransactions && summary.allTransactions.length > 0) {
        context += `**All Transactions (${summary.allTransactions.length} total):**\n`;
        context += `Format: Date | Description | Merchant | Amount | Category\n`;
        context += `---\n`;
        summary.allTransactions.forEach(t => {
            const amountStr = t.amount >= 0
                ? `+${formatCurrency(t.amount)}`
                : formatCurrency(t.amount);
            context += `${t.date} | ${t.description} | ${t.merchantKey} | ${amountStr} | ${t.category}\n`;
        });
    }

    return context;
}
