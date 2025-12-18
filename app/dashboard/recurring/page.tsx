'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, DollarSign, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Subscription {
  merchant_key: string;
  merchant_name: string;
  first_charge_date: string;
  last_charge_date: string;
  total_charges: number;
  average_amount: number;
  total_spent: number;
  status: 'active' | 'cancelled' | 'potentially_inactive';
  user_marked_status?: 'active' | 'cancelled';
  cancelled_date?: string;
  days_since_last_charge: number;
  is_ongoing: boolean;
  notes?: string;
}

export default function RecurringPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptions();
    }
  }, [user]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/api/subscriptions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscriptions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (
    merchantKey: string,
    status: 'active' | 'cancelled'
  ) => {
    try {
      setUpdatingStatus(merchantKey);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/api/subscriptions/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          merchant_key: merchantKey,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription status');
      }

      toast({
        title: 'Success',
        description: `Subscription marked as ${status}`,
      });

      await loadSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
      setCancelDialogOpen(false);
      setSelectedSubscription(null);
    }
  };

  const handleCancelClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setCancelDialogOpen(true);
  };

  const handleEditNotes = (subscription: Subscription) => {
    setEditingNotes(subscription.merchant_key);
    setNotesValue(subscription.notes || '');
  };

  const handleSaveNotes = async (merchantKey: string) => {
    try {
      setSavingNotes(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const subscription = subscriptions.find(s => s.merchant_key === merchantKey);
      const response = await fetch('/api/subscriptions/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          merchant_key: merchantKey,
          status: subscription?.user_marked_status || 'active',
          notes: notesValue.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notes');
      }

      toast({
        title: 'Success',
        description: 'Notes saved successfully',
      });

      await loadSubscriptions();
      setEditingNotes(null);
      setNotesValue('');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
    setNotesValue('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStats = () => {
    const active = subscriptions.filter((s) => s.status === 'active');
    const cancelled = subscriptions.filter((s) => s.status === 'cancelled');
    const potentiallyInactive = subscriptions.filter(
      (s) => s.status === 'potentially_inactive'
    );

    // Calculate monthly total (average of active subscriptions)
    const monthlyTotal = active.reduce((sum, sub) => sum + sub.average_amount, 0);

    return {
      activeCount: active.length,
      cancelledCount: cancelled.length,
      potentiallyInactiveCount: potentiallyInactive.length,
      monthlyTotal,
    };
  };

  const getStatusBadge = (subscription: Subscription) => {
    if (subscription.status === 'active') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    } else if (subscription.status === 'cancelled') {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/50">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/50">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Potentially Inactive
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const stats = getStats();

  // Empty state
  if (subscriptions.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your recurring subscriptions
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <RefreshCw className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
            No subscriptions found
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            Categorize transactions as "Subscriptions" to track them here. Any transaction
            marked with the Subscriptions category will appear on this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Subscriptions
        </h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your recurring subscriptions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Active Subscriptions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
                {stats.activeCount}
              </span>
              <span className="text-sm text-muted-foreground">ongoing</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Total */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Est. Monthly Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-foreground">
                {formatCurrency(stats.monthlyTotal)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on active subscriptions
            </p>
          </CardContent>
        </Card>

        {/* Cancelled */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-red-600 dark:text-red-400">
                {stats.cancelledCount}
              </span>
              <span className="text-sm text-muted-foreground">marked</span>
            </div>
          </CardContent>
        </Card>

        {/* Potentially Inactive */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-amber-600 dark:text-amber-400">
                {stats.potentiallyInactiveCount}
              </span>
              <span className="text-sm text-muted-foreground">to check</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.merchant_key}
                className={cn(
                  'p-4 rounded-xl border transition-all',
                  subscription.status === 'cancelled'
                    ? 'bg-muted/50 border-border/50 opacity-75'
                    : 'bg-card border-border hover:border-border/80'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {subscription.merchant_name}
                      </h3>
                      {getStatusBadge(subscription)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Average Amount</p>
                        <p className="font-semibold text-foreground">
                          {formatCurrency(subscription.average_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Spent</p>
                        <p className="font-semibold text-foreground">
                          {formatCurrency(subscription.total_spent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">First Charge</p>
                        <p className="font-semibold text-foreground">
                          {format(new Date(subscription.first_charge_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Charge</p>
                        <p className="font-semibold text-foreground">
                          {format(new Date(subscription.last_charge_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{subscription.total_charges} charges</span>
                      <span>•</span>
                      <span>
                        {subscription.days_since_last_charge === 0
                          ? 'Today'
                          : `${subscription.days_since_last_charge} days ago`}
                      </span>
                    </div>

                    {/* Notes section */}
                    {editingNotes === subscription.merchant_key ? (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor={`notes-${subscription.merchant_key}`} className="text-xs">
                          Notes (what is this subscription for?)
                        </Label>
                        <Textarea
                          id={`notes-${subscription.merchant_key}`}
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="e.g., Music streaming service, Cloud storage, etc."
                          className="min-h-[60px] text-sm"
                          disabled={savingNotes}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(subscription.merchant_key)}
                            disabled={savingNotes}
                          >
                            {savingNotes ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={savingNotes}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : subscription.notes ? (
                      <div className="mt-3 p-2 bg-muted/50 rounded-md">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                            <p className="text-sm text-foreground">{subscription.notes}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditNotes(subscription)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditNotes(subscription)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Add note
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {subscription.status === 'cancelled' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateSubscriptionStatus(subscription.merchant_key, 'active')
                        }
                        disabled={updatingStatus === subscription.merchant_key}
                      >
                        {updatingStatus === subscription.merchant_key ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Active
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelClick(subscription)}
                        disabled={updatingStatus === subscription.merchant_key}
                      >
                        {updatingStatus === subscription.merchant_key ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Mark Cancelled
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark subscription as cancelled?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{selectedSubscription?.merchant_name}" as cancelled. The
              subscription won't be counted in your monthly totals. You can always mark it as
              active again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedSubscription) {
                  updateSubscriptionStatus(selectedSubscription.merchant_key, 'cancelled');
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Mark as Cancelled
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
