'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Calendar,
  Upload,
  ArrowRight,
  Wallet,
  RefreshCw,
  Bell,
  PieChart,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, differenceInDays, formatDistanceToNow, isSameMonth, isAfter } from 'date-fns';
import Link from 'next/link';

interface DashboardStats {
  totalTransactions: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashflow: number;
  recurringCharges: number;
  upcomingBills: number;
  transactionCount: number;
}

interface CategorySpending {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  count: number;
}

interface Subscription {
  merchant_key: string;
  merchant_name: string;
  average_amount: number;
  status: 'active' | 'cancelled' | 'potentially_inactive';
  last_charge_date: string;
}

interface Bill {
  merchant_key: string;
  merchant_name: string;
  average_amount: number;
  typical_due_day: number;
  status: 'paid_this_month' | 'due_soon' | 'overdue' | 'upcoming' | 'inactive';
}

interface IncomeTransaction {
  id: string;
  description: string;
  amount: number;
  posted_date: string;
  category_name?: string;
}

interface ExpensesByCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  count: number;
  transactions: IncomeTransaction[];
}

type DateRange = 'month' | '6months' | 'year';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topCategories, setTopCategories] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUploadDate, setLastUploadDate] = useState<Date | null>(null);
  const [showUploadReminder, setShowUploadReminder] = useState(false);

  // Selected month for main dashboard stats
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Date range for categories
  const [categoryDateRange, setCategoryDateRange] = useState<DateRange>('month');
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Subscriptions and Bills
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [billsLoading, setBillsLoading] = useState(true);

  // Modal states
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expensesModalOpen, setExpensesModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpensesByCategory | null>(null);

  // Modal data
  const [incomeTransactions, setIncomeTransactions] = useState<IncomeTransaction[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategory[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadSubscriptions();
      loadBills();
    }
  }, [user, selectedMonth]);

  useEffect(() => {
    if (user) {
      loadCategoryData();
    }
  }, [user, categoryDateRange]);

  const getDateRangeStart = (range: DateRange): Date => {
    const now = new Date();
    switch (range) {
      case 'month':
        return startOfMonth(now);
      case '6months':
        return startOfMonth(subMonths(now, 5));
      case 'year':
        return startOfMonth(subMonths(now, 11));
      default:
        return startOfMonth(now);
    }
  };

  const getDateRangeLabel = (range: DateRange): string => {
    switch (range) {
      case 'month':
        return 'This Month';
      case '6months':
        return 'Last 6 Months';
      case 'year':
        return 'Last 12 Months';
      default:
        return 'This Month';
    }
  };

  const loadSubscriptions = async () => {
    if (!user) return;
    setSubscriptionsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/subscriptions', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const activeSubscriptions = data.subscriptions?.filter(
          (s: Subscription) => s.status === 'active'
        ) || [];
        setSubscriptions(activeSubscriptions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const loadBills = async () => {
    if (!user) return;
    setBillsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/bills', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const upcomingBills = data.bills?.filter(
          (b: Bill) => b.status === 'due_soon' || b.status === 'upcoming' || b.status === 'overdue'
        ) || [];
        setBills(upcomingBills.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setBillsLoading(false);
    }
  };

  const loadCategoryData = async () => {
    if (!user) return;
    setCategoriesLoading(true);

    try {
      const rangeStart = getDateRangeStart(categoryDateRange);
      const today = new Date();

      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          amount,
          category_id,
          categories:category_id (id, name, color, icon, type)
        `)
        .eq('user_id', user.id)
        .gte('posted_date', format(rangeStart, 'yyyy-MM-dd'))
        .lte('posted_date', format(today, 'yyyy-MM-dd'));

      const categoryMap = new Map<string, CategorySpending>();

      transactions?.forEach((t: any) => {
        const amount = Number(t.amount);
        const category = Array.isArray(t.categories) ? t.categories[0] : t.categories;

        if (category?.type !== 'transfer' && amount < 0) {
          const existing = categoryMap.get(category.id);
          if (existing) {
            existing.amount += Math.abs(amount);
            existing.count += 1;
          } else {
            categoryMap.set(category.id, {
              id: category.id,
              name: category.name,
              color: category.color,
              icon: category.icon,
              amount: Math.abs(amount),
              count: 1,
            });
          }
        }
      });

      const sortedCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      setTopCategories(sortedCategories);
    } catch (error) {
      console.error('Error loading category data:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const isCurrentMonth = isSameMonth(selectedMonth, now);
      const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      // For current month, use today. For past months, use end of that month.
      const monthEnd = isCurrentMonth
        ? format(now, 'yyyy-MM-dd')
        : format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          amount,
          posted_date,
          category_id,
          description,
          categories:category_id (id, name, color, icon, type)
        `)
        .eq('user_id', user.id)
        .gte('posted_date', monthStart)
        .lte('posted_date', monthEnd);

      const { count: totalCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch active subscriptions count
      let recurringCount = 0;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const subsResponse = await fetch('/api/subscriptions', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        });
        if (subsResponse.ok) {
          const subsData = await subsResponse.json();
          recurringCount = subsData.subscriptions?.filter(
            (s: any) => s.status === 'active'
          ).length || 0;
        }
      } catch (error) {
        console.error('Error fetching subscriptions count:', error);
      }

      const { count: billsCount } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['due_soon', 'upcoming']);

      const lastUploadResult = await supabase
        .from('uploads')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastUpload = lastUploadResult.data as { created_at: string } | null;

      if (lastUpload) {
        const uploadDate = new Date(lastUpload.created_at);
        setLastUploadDate(uploadDate);
        const daysSinceUpload = differenceInDays(now, uploadDate);
        setShowUploadReminder(daysSinceUpload > 7);
      } else if (totalCount && totalCount > 0) {
        setShowUploadReminder(false);
      }

      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      transactions?.forEach((t: any) => {
        const amount = Number(t.amount);
        const category = Array.isArray(t.categories) ? t.categories[0] : t.categories;
        const isTransfer = category?.type === 'transfer';

        if (!isTransfer && amount > 0) {
          monthlyIncome += amount;
        } else if (!isTransfer && amount < 0) {
          monthlyExpenses += Math.abs(amount);
        }
      });

      setStats({
        totalTransactions: totalCount || 0,
        monthlyIncome,
        monthlyExpenses,
        netCashflow: monthlyIncome - monthlyExpenses,
        recurringCharges: recurringCount || 0,
        upcomingBills: billsCount || 0,
        transactionCount: transactions?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Month navigation helpers
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    const now = new Date();
    // Don't allow going past current month
    if (!isAfter(startOfMonth(nextMonth), startOfMonth(now))) {
      setSelectedMonth(nextMonth);
    }
  };

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const getMonthLabel = () => {
    const now = new Date();
    if (isSameMonth(selectedMonth, now)) {
      return `Month-to-date overview for ${format(now, 'MMMM d, yyyy')}`;
    }
    return `Overview for ${format(selectedMonth, 'MMMM yyyy')}`;
  };

  const loadIncomeBreakdown = async () => {
    if (!user) return;
    setModalLoading(true);

    try {
      const now = new Date();
      const isCurrentMonthSelected = isSameMonth(selectedMonth, now);
      const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const monthEnd = isCurrentMonthSelected
        ? format(now, 'yyyy-MM-dd')
        : format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          posted_date,
          description,
          categories:category_id (name, type)
        `)
        .eq('user_id', user.id)
        .gte('posted_date', monthStart)
        .lte('posted_date', monthEnd)
        .gt('amount', 0)
        .order('amount', { ascending: false });

      const incomeList: IncomeTransaction[] = transactions?.filter((t: any) => {
        const category = Array.isArray(t.categories) ? t.categories[0] : t.categories;
        return category?.type !== 'transfer';
      }).map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        posted_date: t.posted_date,
        category_name: Array.isArray(t.categories) ? t.categories[0]?.name : t.categories?.name,
      })) || [];

      setIncomeTransactions(incomeList);
    } catch (error) {
      console.error('Error loading income breakdown:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const loadExpensesBreakdown = async () => {
    if (!user) return;
    setModalLoading(true);

    try {
      const now = new Date();
      const isCurrentMonthSelected = isSameMonth(selectedMonth, now);
      const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const monthEnd = isCurrentMonthSelected
        ? format(now, 'yyyy-MM-dd')
        : format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          posted_date,
          description,
          category_id,
          categories:category_id (id, name, color, icon, type)
        `)
        .eq('user_id', user.id)
        .gte('posted_date', monthStart)
        .lte('posted_date', monthEnd)
        .lt('amount', 0)
        .order('amount', { ascending: true });

      const categoryMap = new Map<string, ExpensesByCategory>();

      transactions?.forEach((t: any) => {
        const amount = Math.abs(Number(t.amount));
        const category = Array.isArray(t.categories) ? t.categories[0] : t.categories;

        if (category?.type !== 'transfer') {
          const existing = categoryMap.get(category.id);
          const transaction: IncomeTransaction = {
            id: t.id,
            description: t.description,
            amount: t.amount,
            posted_date: t.posted_date,
          };

          if (existing) {
            existing.amount += amount;
            existing.count += 1;
            existing.transactions.push(transaction);
          } else {
            categoryMap.set(category.id, {
              id: category.id,
              name: category.name,
              color: category.color,
              icon: category.icon,
              amount: amount,
              count: 1,
              transactions: [transaction],
            });
          }
        }
      });

      const sortedCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.amount - a.amount);

      setExpensesByCategory(sortedCategories);
    } catch (error) {
      console.error('Error loading expenses breakdown:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleIncomeClick = () => {
    setIncomeModalOpen(true);
    loadIncomeBreakdown();
  };

  const handleExpensesClick = () => {
    setExpensesModalOpen(true);
    loadExpensesBreakdown();
  };

  const handleCategoryClick = (category: ExpensesByCategory) => {
    setSelectedCategory(category);
    setCategoryModalOpen(true);
  };

  const handleTopCategoryClick = async (categoryId: string) => {
    if (!user) return;
    setModalLoading(true);
    setCategoryModalOpen(true);

    try {
      const rangeStart = getDateRangeStart(categoryDateRange);
      const today = new Date();

      const { data: category } = await supabase
        .from('categories')
        .select('id, name, color, icon')
        .eq('id', categoryId)
        .single();

      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, amount, posted_date, description')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .gte('posted_date', format(rangeStart, 'yyyy-MM-dd'))
        .lte('posted_date', format(today, 'yyyy-MM-dd'))
        .lt('amount', 0)
        .order('posted_date', { ascending: false });

      const totalAmount = transactions?.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

      setSelectedCategory({
        id: category?.id || categoryId,
        name: category?.name || 'Category',
        color: category?.color || '#6366f1',
        icon: category?.icon || 'tag',
        amount: totalAmount,
        count: transactions?.length || 0,
        transactions: transactions?.map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          posted_date: t.posted_date,
        })) || [],
      });
    } catch (error) {
      console.error('Error loading category transactions:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyDetailed = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const totalCategorySpending = topCategories.reduce((sum, c) => sum + c.amount, 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (stats?.totalTransactions === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Welcome to FinanceFlow
          </h1>
          <p className="text-muted-foreground mt-1">
            Let's get started with your financial journey
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
            No transactions yet
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Import your first CSV file from your bank to start tracking your finances and see insights here.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard/import">
              <Upload className="h-4 w-4" />
              Import CSV
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {getMonthLabel()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-md hover:bg-background transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium min-w-[100px] text-center">
              {format(selectedMonth, 'MMM yyyy')}
            </span>
            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                isCurrentMonth
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "hover:bg-background"
              )}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/dashboard/import">
              <Upload className="h-4 w-4" />
              Import
            </Link>
          </Button>
        </div>
      </div>

      {/* Upload Reminder */}
      {showUploadReminder && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Time to update your finances
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Last import was {lastUploadDate && formatDistanceToNow(lastUploadDate, { addSuffix: true })}
            </p>
          </div>
          <Button size="sm" variant="ghost" asChild className="text-amber-700 hover:text-amber-900 hover:bg-amber-100">
            <Link href="/dashboard/import">
              Import Now
            </Link>
          </Button>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Monthly Income - Clickable */}
        <button
          onClick={handleIncomeClick}
          className="stat-card group text-left hover:border-emerald-500/50 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="badge-success">
              <TrendingUp className="h-3 w-3" />
              Income
            </span>
          </div>
          <p className="metric-value text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats?.monthlyIncome || 0)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="metric-label">{isCurrentMonth ? 'Month-to-Date' : format(selectedMonth, 'MMMM')} Income</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
          </div>
        </button>

        {/* Monthly Expenses - Clickable */}
        <button
          onClick={handleExpensesClick}
          className="stat-card group text-left hover:border-red-500/50 hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="badge-danger">
              <TrendingDown className="h-3 w-3" />
              Spent
            </span>
          </div>
          <p className="metric-value text-red-600 dark:text-red-400">
            {formatCurrency(stats?.monthlyExpenses || 0)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="metric-label">{isCurrentMonth ? 'Month-to-Date' : format(selectedMonth, 'MMMM')} Expenses</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
          </div>
        </button>

        {/* Net Cashflow */}
        <div className={cn(
          "stat-card group",
          (stats?.netCashflow || 0) >= 0
            ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-900/50"
            : "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-900/50"
        )}>
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              (stats?.netCashflow || 0) >= 0
                ? "bg-emerald-100 dark:bg-emerald-900/50"
                : "bg-red-100 dark:bg-red-900/50"
            )}>
              <Wallet className={cn(
                "h-5 w-5",
                (stats?.netCashflow || 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )} />
            </div>
          </div>
          <p className={cn(
            "metric-value",
            (stats?.netCashflow || 0) >= 0
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-red-700 dark:text-red-300"
          )}>
            {formatCurrency(stats?.netCashflow || 0)}
          </p>
          <p className="metric-label mt-1">Net Cashflow</p>
        </div>

        {/* Transaction Count */}
        <div className="stat-card group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="metric-value">
            {stats?.transactionCount || 0}
          </p>
          <p className="metric-label mt-1">{isCurrentMonth ? 'This Month\'s' : format(selectedMonth, 'MMMM') + '\'s'} Transactions</p>
        </div>
      </div>

      {/* Top Spending Categories */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              Top Spending Categories
            </CardTitle>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setCategoryDateRange('month')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  categoryDateRange === 'month'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Month
              </button>
              <button
                onClick={() => setCategoryDateRange('6months')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  categoryDateRange === '6months'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                6 Months
              </button>
              <button
                onClick={() => setCategoryDateRange('year')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  categoryDateRange === 'year'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Year
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getDateRangeLabel(categoryDateRange)}
          </p>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map((category) => {
                const percentage = ((category.amount / totalCategorySpending) * 100).toFixed(0);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleTopCategoryClick(category.id)}
                    className="w-full space-y-1 text-left hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                        <span className="text-xs text-muted-foreground">
                          ({category.count} transactions)
                        </span>
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        {formatCurrency(category.amount)} ({percentage}%)
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No spending data for this period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Subscriptions & Bills Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Active Subscriptions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-500" />
                Active Subscriptions
              </CardTitle>
              <Link
                href="/dashboard/recurring"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {subscriptionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : subscriptions.length > 0 ? (
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.merchant_key}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium truncate max-w-[60%]">
                      {sub.merchant_name}
                    </span>
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      {formatCurrencyDetailed(sub.average_amount)}/mo
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Total</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrencyDetailed(subscriptions.reduce((sum, s) => sum + s.average_amount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active subscriptions found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bills */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Upcoming Bills
              </CardTitle>
              <Link
                href="/dashboard/bills"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {billsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : bills.length > 0 ? (
              <div className="space-y-2">
                {bills.map((bill) => (
                  <div
                    key={bill.merchant_key}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block max-w-[70%]">
                        {bill.merchant_name}
                      </span>
                      <span className={cn(
                        "text-xs",
                        bill.status === 'overdue' ? "text-red-500" :
                          bill.status === 'due_soon' ? "text-amber-500" :
                            "text-muted-foreground"
                      )}>
                        {bill.status === 'overdue' ? 'Overdue' :
                          bill.status === 'due_soon' ? 'Due soon' :
                            `Due ~${bill.typical_due_day}${getOrdinalSuffix(bill.typical_due_day)}`}
                      </span>
                    </div>
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      ~{formatCurrencyDetailed(bill.average_amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming bills
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/dashboard/transactions">
            <div className="p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-card transition-all text-center group cursor-pointer">
              <CreditCard className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-sm font-medium text-foreground">Transactions</p>
            </div>
          </Link>
          <Link href="/dashboard/categories">
            <div className="p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-card transition-all text-center group cursor-pointer">
              <div className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z" />
                  <path d="M6 9.01V9" />
                  <path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Categories</p>
            </div>
          </Link>
          <Link href="/dashboard/calendar">
            <div className="p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-card transition-all text-center group cursor-pointer">
              <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-sm font-medium text-foreground">Calendar</p>
            </div>
          </Link>
          <Link href="/dashboard/rules">
            <div className="p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-card transition-all text-center group cursor-pointer">
              <div className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Rules</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Income Breakdown Modal */}
      <Dialog open={incomeModalOpen} onOpenChange={setIncomeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Income Breakdown
            </DialogTitle>
            <DialogDescription>
              {isCurrentMonth ? 'Month-to-date' : format(selectedMonth, 'MMMM yyyy')} income transactions
            </DialogDescription>
          </DialogHeader>

          {modalLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : incomeTransactions.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {incomeTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.posted_date), 'MMM d, yyyy')}
                        {tx.category_name && ` • ${tx.category_name}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-2">
                      +{formatCurrencyDetailed(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No income transactions this month
            </p>
          )}

          {incomeTransactions.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Income</span>
                <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyDetailed(incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expenses Breakdown Modal */}
      <Dialog open={expensesModalOpen} onOpenChange={setExpensesModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              Expenses Breakdown
            </DialogTitle>
            <DialogDescription>
              {isCurrentMonth ? 'Month-to-date' : format(selectedMonth, 'MMMM yyyy')} expenses by category
            </DialogDescription>
          </DialogHeader>

          {modalLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : expensesByCategory.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {expensesByCategory.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div>
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.count} transaction{cat.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatCurrencyDetailed(cat.amount)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No expenses this month
            </p>
          )}

          {expensesByCategory.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Expenses</span>
                <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {formatCurrencyDetailed(expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Transactions Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCategory && (
                <>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${selectedCategory.color}20` }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                  </div>
                  {selectedCategory.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory?.count} transaction{selectedCategory?.count !== 1 ? 's' : ''} •{' '}
              {selectedCategory && formatCurrencyDetailed(selectedCategory.amount)} total
            </DialogDescription>
          </DialogHeader>

          {modalLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : selectedCategory?.transactions && selectedCategory.transactions.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {selectedCategory.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.posted_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400 ml-2">
                      {formatCurrencyDetailed(Math.abs(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions in this category
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
