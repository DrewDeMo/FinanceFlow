'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, CheckCircle, X, FileText, Calendar, TrendingUp, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RecurringSeries {
  id: string;
  merchant_key: string;
  merchant_name: string;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  average_amount: number;
  last_amount: number;
  amount_variance: number;
  confidence: 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'cancelled' | 'pending_confirmation';
  occurrence_count: number;
  last_occurrence_date: string;
  next_expected_date: string;
  is_variable: boolean;
  is_subscription?: boolean;
  subscription_confidence?: number;
  source?: 'detected' | 'categorized';
  has_bill?: boolean;
}

interface CategorizedSubscription {
  merchant_key: string;
  merchant_name: string;
  transaction_count: number;
  average_amount: number;
  last_transaction_date: string;
  total_spent: number;
  first_transaction_date?: string;
  months_active?: number;
}

export default function RecurringPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recurringSeries, setRecurringSeries] = useState<RecurringSeries[]>([]);
  const [categorizedSubscriptions, setCategorizedSubscriptions] = useState<CategorizedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecurringSeries();
      loadCategorizedSubscriptions();
    }
  }, [user]);

  const loadRecurringSeries = async () => {
    if (!user) return;

    try {
      // Get all recurring series
      const { data, error } = await supabase
        .from('recurring_series')
        .select('*')
        .eq('user_id', user.id)
        .order('confidence', { ascending: false })
        .order('average_amount', { ascending: false });

      if (error) throw error;

      // Get all bills to check which recurring series have been converted to bills
      const { data: billsData } = await supabase
        .from('bills')
        .select('recurring_series_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const billSeriesIds = new Set(
        (billsData || [])
          .map(b => b.recurring_series_id)
          .filter(id => id !== null)
      );

      // Filter out recurring series that have been converted to bills
      const filteredData = (data || [])
        .filter(series => !billSeriesIds.has(series.id))
        .map(s => ({ ...s, source: 'detected' as const, has_bill: false }));

      setRecurringSeries(filteredData);
    } catch (error) {
      console.error('Error loading recurring series:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recurring charges',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategorizedSubscriptions = async () => {
    if (!user) return;

    try {
      // Get the Subscriptions category
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Subscriptions')
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .limit(1)
        .single();

      if (!categories) return;

      // Get all transactions categorized as Subscriptions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('merchant_key, description, amount, posted_date')
        .eq('user_id', user.id)
        .eq('category_id', categories.id)
        .order('posted_date', { ascending: true }); // Oldest first to get first transaction

      if (error) throw error;

      // Group by merchant_key and calculate stats
      const merchantMap = new Map<string, {
        merchant_key: string;
        merchant_name: string;
        transactions: any[];
        total: number;
      }>();

      transactions?.forEach(tx => {
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
        merchant.total += parseFloat(tx.amount.toString());
      });

      // Convert to CategorizedSubscription format with enhanced info
      const subscriptions: CategorizedSubscription[] = Array.from(merchantMap.values()).map(m => {
        const firstDate = new Date(m.transactions[0].posted_date);
        const lastDate = new Date(m.transactions[m.transactions.length - 1].posted_date);
        const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
          (lastDate.getMonth() - firstDate.getMonth()) + 1;

        return {
          merchant_key: m.merchant_key,
          merchant_name: m.merchant_name,
          transaction_count: m.transactions.length,
          average_amount: m.total / m.transactions.length,
          last_transaction_date: m.transactions[m.transactions.length - 1].posted_date,
          first_transaction_date: m.transactions[0].posted_date,
          total_spent: m.total,
          months_active: monthsDiff,
        };
      });

      setCategorizedSubscriptions(subscriptions);
    } catch (error) {
      console.error('Error loading categorized subscriptions:', error);
    }
  };

  const detectRecurring = async () => {
    if (!user) return;

    setDetecting(true);
    try {
      const response = await fetch('/api/recurring/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) throw new Error('Detection failed');

      const result = await response.json();
      toast({
        title: 'Success',
        description: `Detected ${result.detected} recurring charges (${result.inserted} new, ${result.updated} updated)`,
      });

      await loadRecurringSeries();
      await loadCategorizedSubscriptions();
    } catch (error) {
      console.error('Error detecting recurring charges:', error);
      toast({
        title: 'Error',
        description: 'Failed to detect recurring charges',
        variant: 'destructive',
      });
    } finally {
      setDetecting(false);
    }
  };

  const clearAll = async () => {
    if (!user) return;

    try {
      await supabase
        .from('bills')
        .delete()
        .eq('user_id', user.id);

      await supabase
        .from('recurring_series')
        .delete()
        .eq('user_id', user.id);

      toast({
        title: 'Success',
        description: 'All recurring charges and bills cleared',
      });

      await loadRecurringSeries();
      await loadCategorizedSubscriptions();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear data',
        variant: 'destructive',
      });
    }
  };

  const confirmAllPending = async () => {
    if (!user) return;

    try {
      const pending = recurringSeries.filter(s => s.status === 'pending_confirmation');

      for (const series of pending) {
        await (supabase
          .from('recurring_series')
          .update as any)({ status: 'active' })
          .eq('id', series.id);
      }

      toast({
        title: 'Success',
        description: `Confirmed ${pending.length} recurring charges`,
      });

      await loadRecurringSeries();
      await loadCategorizedSubscriptions();
    } catch (error) {
      console.error('Error confirming charges:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm charges',
        variant: 'destructive',
      });
    }
  };

  const updateStatus = async (id: string, status: RecurringSeries['status']) => {
    try {
      await (supabase
        .from('recurring_series')
        .update as any)({ status })
        .eq('id', id);

      toast({
        title: 'Success',
        description: `Recurring charge ${status === 'active' ? 'confirmed' : 'dismissed'}`,
      });

      await loadRecurringSeries();
      await loadCategorizedSubscriptions();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update recurring charge',
        variant: 'destructive',
      });
    }
  };

  const confirmAsSubscription = async (series: RecurringSeries) => {
    try {
      // Get the Subscriptions category
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Subscriptions')
        .or(`user_id.eq.${user!.id},is_system.eq.true`)
        .limit(1)
        .single();

      if (!categories) {
        toast({
          title: 'Error',
          description: 'Subscriptions category not found',
          variant: 'destructive',
        });
        return;
      }

      const subscriptionCategoryId = categories.id;

      // Update all transactions with this merchant_key to Subscriptions category
      const { error: transactionsError } = await supabase
        .from('transactions')
        .update({
          category_id: subscriptionCategoryId,
          classification_source: 'manual',
          classification_confidence: 1.0,
        })
        .eq('user_id', user!.id)
        .eq('merchant_key', series.merchant_key);

      if (transactionsError) throw transactionsError;

      // Update recurring series status to active
      await (supabase
        .from('recurring_series')
        .update as any)({ status: 'active' })
        .eq('id', series.id);

      toast({
        title: 'Success',
        description: `${series.merchant_name} confirmed as subscription and all transactions categorized`,
      });

      await loadRecurringSeries();
      await loadCategorizedSubscriptions();
    } catch (error) {
      console.error('Error confirming subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm subscription',
        variant: 'destructive',
      });
    }
  };

  const createBill = async (series: RecurringSeries) => {
    try {
      const nextDueDate = new Date(series.next_expected_date);
      const dueDay = nextDueDate.getDate();

      await (supabase
        .from('bills')
        .insert as any)({
          user_id: user!.id,
          recurring_series_id: series.id,
          name: series.merchant_name,
          typical_amount: series.average_amount,
          amount_range_min: series.average_amount * 0.9,
          amount_range_max: series.average_amount * 1.1,
          due_day: dueDay,
          grace_days: 3,
          autopay: false,
          status: 'upcoming',
          next_due_date: series.next_expected_date,
          is_active: true,
        });

      await (supabase
        .from('recurring_series')
        .update as any)({ status: 'active' })
        .eq('id', series.id);

      toast({
        title: 'Success',
        description: `Bill created for ${series.merchant_name}`,
      });

      await loadRecurringSeries();
      await loadCategorizedSubscriptions();
    } catch (error) {
      console.error('Error creating bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to create bill',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCadenceLabel = (cadence: string) => {
    const labels = {
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Annual',
    };
    return labels[cadence as keyof typeof labels] || cadence;
  };

  const calculateMonthlyEquivalent = (amount: number, cadence: string) => {
    const multipliers = {
      weekly: 4.33,
      biweekly: 2.17,
      monthly: 1,
      quarterly: 0.33,
      annual: 0.083,
    };
    return amount * (multipliers[cadence as keyof typeof multipliers] || 1);
  };

  const getStats = () => {
    const allActiveCharges = [...recurringSeries.filter(s => s.status === 'active'), ...activeCharges];

    const totalMonthly = allActiveCharges.reduce((sum, series) => {
      return sum + calculateMonthlyEquivalent(series.average_amount, series.cadence);
    }, 0);

    const totalAnnual = totalMonthly * 12;

    const subscriptionCount = allActiveCharges.filter(s => s.is_subscription).length;
    const otherRecurringCount = allActiveCharges.length - subscriptionCount;

    const categorizedTotal = categorizedSubscriptions.reduce((sum, sub) => sum + sub.average_amount, 0);

    return {
      totalActive: allActiveCharges.length + categorizedSubscriptions.length,
      totalMonthly: totalMonthly + categorizedTotal,
      totalAnnual: (totalMonthly + categorizedTotal) * 12,
      subscriptionCount: subscriptionCount + categorizedSubscriptions.length,
      otherRecurringCount,
      pendingCount: pendingCharges.length,
    };
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    };
    return (
      <Badge variant={variants[confidence as keyof typeof variants] as any}>
        {confidence.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Recurring Charges</h1>
            <p className="text-slate-400">Loading your recurring charges...</p>
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 bg-white/[0.05] rounded-2xl animate-pulse" />
          <Skeleton className="h-96 bg-white/[0.05] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const pendingCharges = recurringSeries.filter(s => s.status === 'pending_confirmation');
  const activeCharges = recurringSeries.filter(s => s.status === 'active');
  const subscriptions = pendingCharges.filter(s => s.is_subscription);
  const otherRecurring = pendingCharges.filter(s => !s.is_subscription);

  // Merge categorized subscriptions with detected ones, avoiding duplicates
  const detectedMerchantKeys = new Set(recurringSeries.map(s => s.merchant_key));
  const uniqueCategorizedSubscriptions = categorizedSubscriptions.filter(
    cs => !detectedMerchantKeys.has(cs.merchant_key)
  );

  const stats = getStats();

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl">
                <RefreshCw className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">Recurring Charges</h1>
          </div>
          <p className="text-slate-400">Manage subscriptions and recurring charges - bills are tracked separately in the Bills page</p>
        </div>
        <div className="flex gap-2">
          {recurringSeries.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.1] backdrop-blur-xl transition-all duration-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-white/[0.1] text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Clear All Recurring Charges?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This will delete all recurring charges and bills. Your transactions will not be affected.
                    You can re-run detection afterward to find patterns again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAll} className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border-0">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            onClick={detectRecurring}
            disabled={detecting}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg transition-all duration-300 hover:scale-105"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${detecting ? 'animate-spin' : ''}`} />
            {detecting ? 'Detecting...' : 'Detect Patterns'}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {(stats.totalActive > 0 || stats.pendingCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardDescription className="text-slate-400">Active Subscriptions</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-white">{stats.totalActive}</div>
              <p className="text-xs text-slate-400 mt-1">
                {stats.subscriptionCount} subscriptions, {stats.otherRecurringCount} other
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardDescription className="text-slate-400">Monthly Total</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalMonthly)}</div>
              <p className="text-xs text-slate-400 mt-1">Est. recurring charges/month</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardDescription className="text-slate-400">Annual Total</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalAnnual)}</div>
              <p className="text-xs text-slate-400 mt-1">Est. yearly spending</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardDescription className="text-slate-400">Pending Review</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-white">{stats.pendingCount}</div>
              <p className="text-xs text-slate-400 mt-1">Awaiting confirmation</p>
            </CardContent>
          </Card>
        </div>
      )}

      {subscriptions.length > 0 && (
        <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
                    <RefreshCw className="h-4 w-4 text-white" />
                  </div>
                  Detected Subscriptions ({subscriptions.length})
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  High-confidence subscription services detected by AI
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {subscriptions.map((series) => (
                <Card key={series.id} className="border-0 bg-white/[0.05] backdrop-blur-xl hover:bg-white/[0.08] transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">
                            {series.merchant_name}
                          </h3>
                          <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-0">
                            {series.subscription_confidence}% Match
                          </Badge>
                          <Badge variant="outline" className="border-white/[0.2] text-white bg-white/[0.05]">
                            {series.confidence.toUpperCase()}
                          </Badge>
                          {series.is_variable && (
                            <Badge variant="outline" className="border-orange-400/40 text-orange-400 bg-orange-500/10">
                              Variable Amount
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-slate-400">Average Amount</p>
                            <p className="font-semibold text-white">{formatCurrency(series.average_amount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Frequency</p>
                            <p className="font-semibold text-white">{getCadenceLabel(series.cadence)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Occurrences</p>
                            <p className="font-semibold text-white">{series.occurrence_count}x</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Next Expected</p>
                            <p className="font-semibold text-white">
                              {format(new Date(series.next_expected_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg"
                          onClick={() => confirmAsSubscription(series)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirm Subscription
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white"
                          onClick={() => updateStatus(series.id, 'active')}
                        >
                          Confirm as Recurring
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-white hover:bg-white/[0.05]"
                          onClick={() => updateStatus(series.id, 'cancelled')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {otherRecurring.length > 0 && (
        <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  Other Recurring Charges ({otherRecurring.length})
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  Review these detected patterns and confirm if they are recurring charges
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {otherRecurring.map((series) => (
                <Card key={series.id} className="border-0 bg-white/[0.05] backdrop-blur-xl hover:bg-white/[0.08] transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">
                            {series.merchant_name}
                          </h3>
                          <Badge variant="outline" className="border-white/[0.2] text-white bg-white/[0.05]">
                            {series.confidence.toUpperCase()}
                          </Badge>
                          {series.is_variable && (
                            <Badge variant="outline" className="border-orange-400/40 text-orange-400 bg-orange-500/10">
                              Variable Amount
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-slate-400">Average Amount</p>
                            <p className="font-semibold text-white">{formatCurrency(series.average_amount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Frequency</p>
                            <p className="font-semibold text-white">{getCadenceLabel(series.cadence)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Occurrences</p>
                            <p className="font-semibold text-white">{series.occurrence_count}x</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Next Expected</p>
                            <p className="font-semibold text-white">
                              {format(new Date(series.next_expected_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white"
                          onClick={() => updateStatus(series.id, 'active')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Make Bill
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-900 border-white/[0.1] text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Create Bill</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                This will create a bill for {series.merchant_name} with automatic payment tracking.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => createBill(series)}
                                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
                              >
                                Create Bill
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-white hover:bg-white/[0.05]"
                          onClick={() => updateStatus(series.id, 'cancelled')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {uniqueCategorizedSubscriptions.length > 0 && (
        <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <RefreshCw className="h-4 w-4 text-white" />
              </div>
              Categorized Subscriptions ({uniqueCategorizedSubscriptions.length})
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Transactions you've manually categorized as subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {uniqueCategorizedSubscriptions.map((sub) => (
                <Card key={sub.merchant_key} className="border-0 bg-white/[0.05] backdrop-blur-xl hover:bg-white/[0.08] transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-white">{sub.merchant_name}</h3>
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                            Subscription
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400">Average Payment</p>
                            <p className="font-semibold text-white">{formatCurrency(sub.average_amount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Total Spent</p>
                            <p className="font-semibold text-white">{formatCurrency(sub.total_spent)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Active Since</p>
                            <p className="font-semibold text-white">
                              {sub.first_transaction_date ? format(new Date(sub.first_transaction_date), 'MMM yyyy') : 'N/A'}
                              {sub.months_active && sub.months_active > 1 ? ` (${sub.months_active} months)` : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Last Payment</p>
                            <p className="font-semibold text-white">
                              {format(new Date(sub.last_transaction_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-slate-400">
                          {sub.transaction_count} payment{sub.transaction_count !== 1 ? 's' : ''} recorded
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeCharges.length > 0 && (
        <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              Active Recurring Charges ({activeCharges.length})
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Confirmed recurring charges being tracked
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {activeCharges.map((series) => (
                <Card key={series.id} className="border-0 bg-white/[0.05] backdrop-blur-xl hover:bg-white/[0.08] transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{series.merchant_name}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {formatCurrency(series.average_amount)} · {getCadenceLabel(series.cadence)} ·
                          Next: {format(new Date(series.next_expected_date), 'MMM dd')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-white hover:bg-white/[0.05]"
                        onClick={() => updateStatus(series.id, 'paused')}
                      >
                        Pause
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recurringSeries.length === 0 && categorizedSubscriptions.length === 0 && (
        <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent" />
          <CardContent className="p-12 relative">
            <div className="text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white/[0.05] rounded-2xl">
                  <RefreshCw className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                  <p className="text-slate-400 font-medium text-lg">No recurring charges detected yet</p>
                  <p className="text-slate-600 text-sm mt-2">Click "Detect Patterns" to analyze your transactions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
