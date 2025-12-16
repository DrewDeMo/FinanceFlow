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
}

export default function RecurringPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recurringSeries, setRecurringSeries] = useState<RecurringSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecurringSeries();
    }
  }, [user]);

  const loadRecurringSeries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('recurring_series')
        .select('*')
        .eq('user_id', user.id)
        .order('confidence', { ascending: false })
        .order('average_amount', { ascending: false });

      if (error) throw error;
      setRecurringSeries(data || []);
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
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update recurring charge',
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
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Recurring Charges</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const pendingCharges = recurringSeries.filter(s => s.status === 'pending_confirmation');
  const activeCharges = recurringSeries.filter(s => s.status === 'active');

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Recurring Charges</h1>
          <p className="text-slate-600 mt-2">
            Track your subscriptions and recurring payments
          </p>
        </div>
        <div className="flex gap-2">
          {recurringSeries.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Recurring Charges?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all recurring charges and bills. Your transactions will not be affected.
                    You can re-run detection afterward to find patterns again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAll} className="bg-red-600 hover:bg-red-700">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={detectRecurring} disabled={detecting}>
            <RefreshCw className={`h-4 w-4 mr-2 ${detecting ? 'animate-spin' : ''}`} />
            {detecting ? 'Detecting...' : 'Detect Patterns'}
          </Button>
        </div>
      </div>

      {pendingCharges.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <AlertCircle className="h-5 w-5" />
                  Pending Confirmation ({pendingCharges.length})
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Review these detected patterns and confirm if they are recurring charges
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={confirmAllPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingCharges.map((series) => (
                <Card key={series.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {series.merchant_name}
                          </h3>
                          {getConfidenceBadge(series.confidence)}
                          {series.is_variable && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Variable Amount
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-slate-500">Average Amount</p>
                            <p className="font-semibold text-slate-900">{formatCurrency(series.average_amount)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Frequency</p>
                            <p className="font-semibold text-slate-900">{getCadenceLabel(series.cadence)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Occurrences</p>
                            <p className="font-semibold text-slate-900">{series.occurrence_count}x</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Next Expected</p>
                            <p className="font-semibold text-slate-900">
                              {format(new Date(series.next_expected_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(series.id, 'active')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-1" />
                              Make Bill
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Create Bill</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will create a bill for {series.merchant_name} with automatic payment tracking.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => createBill(series)}>
                                Create Bill
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          size="sm"
                          variant="ghost"
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

      {activeCharges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Active Recurring Charges ({activeCharges.length})
            </CardTitle>
            <CardDescription>
              Confirmed recurring charges being tracked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCharges.map((series) => (
                <Card key={series.id} className="bg-slate-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{series.merchant_name}</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {formatCurrency(series.average_amount)} · {getCadenceLabel(series.cadence)} ·
                          Next: {format(new Date(series.next_expected_date), 'MMM dd')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
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

      {recurringSeries.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-slate-500">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No recurring charges detected yet</p>
              <p className="text-sm mt-2">Click "Detect Patterns" to analyze your transactions</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
