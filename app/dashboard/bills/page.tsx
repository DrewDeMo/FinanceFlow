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
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, FileText, Edit2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Bill {
  merchant_key: string;
  merchant_name: string;
  first_payment_date: string;
  last_payment_date: string;
  total_payments: number;
  average_amount: number;
  min_amount: number;
  max_amount: number;
  total_spent: number;
  typical_due_day: number;
  status: 'paid_this_month' | 'due_soon' | 'overdue' | 'upcoming' | 'inactive';
  user_marked_status?: 'active' | 'inactive' | 'paid_this_month';
  days_since_last_payment: number;
  is_variable: boolean;
  notes?: string;
  paid_this_month: boolean;
  last_paid_amount?: number;
}

export default function BillsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (user) {
      loadBills();
    }
  }, [user]);

  const loadBills = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/api/bills', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }

      const data = await response.json();
      setBills(data.bills || []);
    } catch (error) {
      console.error('Error loading bills:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bills',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBillStatus = async (
    merchantKey: string,
    status: 'active' | 'inactive' | 'paid_this_month'
  ) => {
    try {
      setUpdatingStatus(merchantKey);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch('/api/bills/status', {
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
        throw new Error('Failed to update bill status');
      }

      toast({
        title: 'Success',
        description: status === 'paid_this_month'
          ? 'Bill marked as paid for this month'
          : status === 'inactive'
            ? 'Bill marked as inactive'
            : 'Bill marked as active',
      });

      await loadBills();
    } catch (error) {
      console.error('Error updating bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bill status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
      setMarkPaidDialogOpen(false);
      setSelectedBill(null);
    }
  };

  const handleMarkPaidClick = (bill: Bill) => {
    setSelectedBill(bill);
    setMarkPaidDialogOpen(true);
  };

  const handleEditNotes = (bill: Bill) => {
    setEditingNotes(bill.merchant_key);
    setNotesValue(bill.notes || '');
  };

  const handleSaveNotes = async (merchantKey: string) => {
    try {
      setSavingNotes(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const bill = bills.find(b => b.merchant_key === merchantKey);
      const response = await fetch('/api/bills/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          merchant_key: merchantKey,
          status: bill?.user_marked_status || 'active',
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

      await loadBills();
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
    const paidThisMonth = bills.filter((b) => b.status === 'paid_this_month');
    const dueSoon = bills.filter((b) => b.status === 'due_soon');
    const overdue = bills.filter((b) => b.status === 'overdue');
    const upcoming = bills.filter((b) => b.status === 'upcoming');

    // Calculate monthly total (average of active bills)
    const activeBills = bills.filter((b) => b.status !== 'inactive');
    const monthlyTotal = activeBills.reduce((sum, bill) => sum + bill.average_amount, 0);

    return {
      paidThisMonthCount: paidThisMonth.length,
      dueSoonCount: dueSoon.length,
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
      monthlyTotal,
    };
  };

  const getStatusBadge = (bill: Bill) => {
    if (bill.status === 'paid_this_month') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid This Month
        </Badge>
      );
    } else if (bill.status === 'overdue') {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/50">
          <XCircle className="h-3 w-3 mr-1" />
          Missing Payment
        </Badge>
      );
    } else if (bill.status === 'due_soon') {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/50">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Due Soon
        </Badge>
      );
    } else if (bill.status === 'inactive') {
      return (
        <Badge className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-900/50">
          <XCircle className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50">
          <Clock className="h-3 w-3 mr-1" />
          Upcoming
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
  if (bills.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Bills
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your recurring bills and payments
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
            No bills found
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            Categorize transactions as "Bills & Payments" to track them here. Any transaction
            marked with the Bills & Payments category will appear on this page and be analyzed
            for recurring payment patterns.
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
          Bills
        </h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your recurring bills and payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Paid This Month */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
                {stats.paidThisMonthCount}
              </span>
              <span className="text-sm text-muted-foreground">bills</span>
            </div>
          </CardContent>
        </Card>

        {/* Due Soon */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Due Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-amber-600 dark:text-amber-400">
                {stats.dueSoonCount}
              </span>
              <span className="text-sm text-muted-foreground">need attention</span>
            </div>
          </CardContent>
        </Card>

        {/* Missing/Overdue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-red-600 dark:text-red-400">
                {stats.overdueCount}
              </span>
              <span className="text-sm text-muted-foreground">expected</span>
            </div>
          </CardContent>
        </Card>

        {/* Est. Monthly Total */}
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
              Based on active bills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bills List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">All Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bills.map((bill) => (
              <div
                key={bill.merchant_key}
                className={cn(
                  'p-4 rounded-xl border transition-all',
                  bill.status === 'inactive'
                    ? 'bg-muted/50 border-border/50 opacity-75'
                    : 'bg-card border-border hover:border-border/80'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {bill.merchant_name}
                      </h3>
                      {getStatusBadge(bill)}
                      {bill.is_variable && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Variable Amount
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          {bill.is_variable ? 'Typical Amount' : 'Amount'}
                        </p>
                        <p className="font-semibold text-foreground">
                          {formatCurrency(bill.average_amount)}
                        </p>
                        {bill.is_variable && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(bill.min_amount)} - {formatCurrency(bill.max_amount)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Typical Due Day</p>
                        <p className="font-semibold text-foreground">
                          {bill.typical_due_day}{bill.typical_due_day === 1 ? 'st' : bill.typical_due_day === 2 ? 'nd' : bill.typical_due_day === 3 ? 'rd' : 'th'} of month
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Payment</p>
                        <p className="font-semibold text-foreground">
                          {format(new Date(bill.last_payment_date), 'MMM d, yyyy')}
                        </p>
                        {bill.last_paid_amount && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(bill.last_paid_amount)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Spent</p>
                        <p className="font-semibold text-foreground">
                          {formatCurrency(bill.total_spent)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{bill.total_payments} payments</span>
                      <span>•</span>
                      <span>
                        {bill.days_since_last_payment === 0
                          ? 'Paid today'
                          : `${bill.days_since_last_payment} days ago`}
                      </span>
                    </div>

                    {/* Notes section */}
                    {editingNotes === bill.merchant_key ? (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor={`notes-${bill.merchant_key}`} className="text-xs">
                          Notes (e.g., "Electric bill - autopay enabled")
                        </Label>
                        <Textarea
                          id={`notes-${bill.merchant_key}`}
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes about this bill..."
                          className="min-h-[60px] text-sm"
                          disabled={savingNotes}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(bill.merchant_key)}
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
                    ) : bill.notes ? (
                      <div className="mt-3 p-2 bg-muted/50 rounded-md">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                            <p className="text-sm text-foreground">{bill.notes}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditNotes(bill)}
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
                          onClick={() => handleEditNotes(bill)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Add note
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {bill.status === 'paid_this_month' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateBillStatus(bill.merchant_key, 'active')
                        }
                        disabled={updatingStatus === bill.merchant_key}
                      >
                        {updatingStatus === bill.merchant_key ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Calendar className="h-4 w-4 mr-2" />
                            Mark Unpaid
                          </>
                        )}
                      </Button>
                    ) : bill.status === 'inactive' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateBillStatus(bill.merchant_key, 'active')
                        }
                        disabled={updatingStatus === bill.merchant_key}
                      >
                        {updatingStatus === bill.merchant_key ? (
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
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPaidClick(bill)}
                          disabled={updatingStatus === bill.merchant_key}
                        >
                          {updatingStatus === bill.merchant_key ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Paid
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateBillStatus(bill.merchant_key, 'inactive')
                          }
                          disabled={updatingStatus === bill.merchant_key}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Deactivate
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mark Paid Confirmation Dialog */}
      <AlertDialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark bill as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{selectedBill?.merchant_name}" as paid for this month. The
              status will automatically reset next month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedBill) {
                  updateBillStatus(selectedBill.merchant_key, 'paid_this_month');
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
