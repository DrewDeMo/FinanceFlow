'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInDays, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface DashboardStats {
  totalTransactions: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashflow: number;
  recurringCharges: number;
  upcomingBills: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUploadDate, setLastUploadDate] = useState<Date | null>(null);
  const [showUploadReminder, setShowUploadReminder] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, posted_date')
        .eq('user_id', user.id)
        .gte('posted_date', monthStart)
        .lte('posted_date', monthEnd);

      const { count: totalCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: recurringCount } = await supabase
        .from('recurring_series')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active');

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
        if (Number(t.amount) > 0) {
          monthlyIncome += Number(t.amount);
        } else {
          monthlyExpenses += Math.abs(Number(t.amount));
        }
      });

      setStats({
        totalTransactions: totalCount || 0,
        monthlyIncome,
        monthlyExpenses,
        netCashflow: monthlyIncome - monthlyExpenses,
        recurringCharges: recurringCount || 0,
        upcomingBills: billsCount || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
            Your financial overview for {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Monthly Income */}
        <div className="stat-card group">
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
          <p className="metric-label mt-1">Monthly Income</p>
        </div>

        {/* Monthly Expenses */}
        <div className="stat-card group">
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
          <p className="metric-label mt-1">Monthly Expenses</p>
        </div>

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

        {/* Total Transactions */}
        <div className="stat-card group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="metric-value">
            {stats?.totalTransactions || 0}
          </p>
          <p className="metric-label mt-1">Total Transactions</p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recurring */}
        <Link href="/dashboard/recurring" className="block">
          <div className="stat-card group hover:border-primary/50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {stats?.recurringCharges || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>

        {/* Bills */}
        <Link href="/dashboard/bills" className="block">
          <div className="stat-card group hover:border-primary/50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {stats?.upcomingBills || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Upcoming Bills</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
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
          <Link href="/dashboard/goals">
            <div className="p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-card transition-all text-center group cursor-pointer">
              <div className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Goals</p>
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
    </div>
  );
}
