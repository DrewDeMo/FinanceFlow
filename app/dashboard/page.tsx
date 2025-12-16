'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Calendar, Upload, AlertCircle, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, formatDistanceToNow } from 'date-fns';

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

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">Loading your financial overview...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-xl p-6">
              <Skeleton className="h-32 bg-white/[0.05] rounded-2xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl">
                <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">Financial Overview</h1>
          </div>
          <p className="text-slate-400">Track your income, expenses, and financial goals</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500 mb-1">Current Period</p>
          <p className="text-lg font-semibold text-white">
            {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Monthly Income Card */}
        <Card className="group relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Monthly Income</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <ArrowUpRight className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {formatCurrency(stats?.monthlyIncome || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-white/[0.05]">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              </div>
              <p className="text-xs text-slate-500">
                Total income
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Expenses Card */}
        <Card className="group relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Monthly Expenses</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <ArrowDownRight className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {formatCurrency(stats?.monthlyExpenses || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-white/[0.05]">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500" />
              </div>
              <p className="text-xs text-slate-500">
                Total expenses
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Cashflow Card */}
        <Card className="group relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Net Cashflow</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-2 ${(stats?.netCashflow || 0) >= 0 ? 'text-white' : 'text-orange-400'}`}>
              {formatCurrency(stats?.netCashflow || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-white/[0.05]">
                <div className={`h-full rounded-full ${(stats?.netCashflow || 0) >= 0 ? 'w-4/5 bg-gradient-to-r from-blue-500 to-cyan-500' : 'w-1/3 bg-gradient-to-r from-orange-500 to-amber-500'}`} />
              </div>
              <p className="text-xs text-slate-500">
                Net flow
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions Card */}
        <Card className="group relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Total Transactions</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {stats?.totalTransactions || 0}
            </div>
            <p className="text-xs text-slate-500">
              All time transactions
            </p>
          </CardContent>
        </Card>

        {/* Active Recurring Card */}
        <Card className="group relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Active Recurring</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {stats?.recurringCharges || 0}
            </div>
            <p className="text-xs text-slate-500">
              Active subscriptions
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Bills Card */}
        <Card className="group relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-fuchsia-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Upcoming Bills</CardTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-2.5 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {stats?.upcomingBills || 0}
            </div>
            <p className="text-xs text-slate-500">
              Due soon or upcoming
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Reminder Alert */}
      {showUploadReminder && stats && stats.totalTransactions > 0 && (
        <Alert className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl animate-slide-down">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10" />
          <div className="absolute inset-0 border border-white/[0.05] rounded-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg">
              <AlertCircle className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <AlertDescription className="flex-1 flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="font-semibold text-white text-base block mb-1">
                  Time to update your finances!
                </span>
                <p className="text-slate-400 text-sm">
                  Your last CSV import was {lastUploadDate && formatDistanceToNow(lastUploadDate, { addSuffix: true })}.
                  Keep your data current by importing recent transactions.
                </p>
              </div>
              <Button
                asChild
                className="ml-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl"
              >
                <a href="/dashboard/import" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" strokeWidth={2.5} />
                  Import CSV
                </a>
              </Button>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Empty State Card */}
      {stats?.totalTransactions === 0 && (
        <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-blue-500/5 to-fuchsia-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
          <CardContent className="relative pt-12 pb-12 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-3xl blur-2xl opacity-50" />
              <div className="relative mx-auto w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-3xl flex items-center justify-center shadow-2xl">
                <Upload className="h-10 w-10 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Get Started with FinanceFlow
            </h3>
            <p className="text-slate-400 mb-8 text-base max-w-md mx-auto">
              You haven't imported any transactions yet. Upload a CSV file from your bank to begin tracking your finances.
            </p>
            <a
              href="/dashboard/import"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-2xl hover:shadow-violet-500/25 hover:scale-105 transition-all duration-300"
            >
              <Upload className="h-5 w-5" strokeWidth={2.5} />
              Import Your First CSV
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
