'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Calendar, Upload, AlertCircle } from 'lucide-react';
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
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">{format(new Date(), 'MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.monthlyIncome || 0)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Total income this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.monthlyExpenses || 0)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Total expenses this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.netCashflow || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatCurrency(stats?.netCashflow || 0)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Income minus expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTransactions || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              All time transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recurring</CardTitle>
            <CreditCard className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">
              {stats?.recurringCharges || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Subscriptions & recurring charges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bills</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.upcomingBills || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Due soon or upcoming
            </p>
          </CardContent>
        </Card>
      </div>

      {showUploadReminder && stats && stats.totalTransactions > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-orange-900">Time to update your finances!</span>
              <p className="text-orange-700 mt-1">
                Your last CSV import was {lastUploadDate && formatDistanceToNow(lastUploadDate, { addSuffix: true })}.
                Keep your data current by importing recent transactions.
              </p>
            </div>
            <Button asChild variant="outline" className="ml-4 border-orange-300 hover:bg-orange-100">
              <a href="/dashboard/import">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {stats?.totalTransactions === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Get Started with FinanceFlow
            </h3>
            <p className="text-blue-700 mb-4">
              You haven't imported any transactions yet. Upload a CSV file from your bank to get started.
            </p>
            <a
              href="/dashboard/import"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import Your First CSV
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
