'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus, CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import { format, isAfter, isBefore, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Bill {
  id: string;
  name: string;
  typical_amount: number;
  amount_range_min: number;
  amount_range_max: number;
  due_day: number;
  grace_days: number;
  autopay: boolean;
  status: 'paid' | 'due_soon' | 'overdue' | 'upcoming';
  last_paid_date: string | null;
  next_due_date: string;
  is_active: boolean;
  recurring_series_id: string | null;
}

interface Payment {
  date: string;
  amount: number;
  transaction_id: string;
}

export default function BillsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Map<string, Payment | null>>(new Map());

  useEffect(() => {
    if (user) {
      loadBills();
    }
  }, [user]);

  const loadBills = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('next_due_date', { ascending: true });

      if (error) throw error;

      const billsData = (data || []) as Bill[];
      setBills(billsData);

      const paymentsMap = new Map<string, Payment | null>();

      for (const bill of billsData) {
        const payment = await checkPaymentStatus(bill);
        paymentsMap.set(bill.id, payment);
      }

      setPayments(paymentsMap);
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

  const checkPaymentStatus = async (bill: Bill): Promise<Payment | null> => {
    if (!user) return null;

    const currentMonth = startOfMonth(new Date());
    const nextMonth = endOfMonth(new Date());

    const { data: transactionsResult } = await supabase
      .from('transactions')
      .select('id, posted_date, amount, merchant_key')
      .eq('user_id', user.id)
      .gte('posted_date', format(currentMonth, 'yyyy-MM-dd'))
      .lte('posted_date', format(nextMonth, 'yyyy-MM-dd'));

    if (!transactionsResult) return null;

    const transactions = transactionsResult as Array<{
      id: string;
      posted_date: string;
      amount: number;
      merchant_key: string;
    }>;

    const recurringResult = await supabase
      .from('recurring_series')
      .select('merchant_key')
      .eq('id', bill.recurring_series_id || '')
      .maybeSingle();

    if (!recurringResult?.data) return null;

    const recurring = recurringResult.data as { merchant_key: string };

    const matchingTransaction = transactions.find(t => {
      const amountMatch = Math.abs(t.amount) >= (bill.amount_range_min || 0) &&
                         Math.abs(t.amount) <= (bill.amount_range_max || Infinity);
      const merchantMatch = t.merchant_key === recurring.merchant_key;
      return amountMatch && merchantMatch;
    });

    if (matchingTransaction) {
      return {
        date: matchingTransaction.posted_date,
        amount: Math.abs(matchingTransaction.amount),
        transaction_id: matchingTransaction.id,
      };
    }

    return null;
  };

  const markAsPaid = async (billId: string, transactionDate: string) => {
    try {
      await (supabase
        .from('bills')
        .update as any)({
          last_paid_date: transactionDate,
          status: 'paid',
        })
        .eq('id', billId);

      toast({
        title: 'Success',
        description: 'Bill marked as paid',
      });

      await loadBills();
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark bill as paid',
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

  const getBillStatusBadge = (bill: Bill, payment: Payment | null) => {
    if (payment) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    }

    const dueDate = new Date(bill.next_due_date);
    const today = new Date();
    const dueSoonThreshold = addDays(today, 3);

    if (isAfter(today, dueDate)) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <XCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    } else if (isBefore(dueDate, dueSoonThreshold)) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Due Soon
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          <Clock className="h-3 w-3 mr-1" />
          Upcoming
        </Badge>
      );
    }
  };

  const getStats = () => {
    let upcoming = 0;
    let dueSoon = 0;
    let overdue = 0;
    let paid = 0;

    const today = new Date();
    const dueSoonThreshold = addDays(today, 3);

    bills.forEach(bill => {
      const payment = payments.get(bill.id);
      if (payment) {
        paid++;
        return;
      }

      const dueDate = new Date(bill.next_due_date);
      if (isAfter(today, dueDate)) {
        overdue++;
      } else if (isBefore(dueDate, dueSoonThreshold)) {
        dueSoon++;
      } else {
        upcoming++;
      }
    });

    return { upcoming, dueSoon, overdue, paid };
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Bills</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bills</h1>
          <p className="text-slate-600 mt-2">
            Manage and track your recurring bills and due dates
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-slate-600 mt-1">Already paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-slate-600 mt-1">Due later this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.dueSoon}</div>
            <p className="text-xs text-slate-600 mt-1">Due within 3 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-slate-600 mt-1">Past due date</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bill Schedule
          </CardTitle>
          <CardDescription>
            Your bills and payment status for this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bills added yet.</p>
              <p className="text-sm mt-2">Go to Recurring Charges to convert detected patterns to bills.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill) => {
                const payment = payments.get(bill.id) || null;
                return (
                  <Card key={bill.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-slate-900">{bill.name}</h3>
                            {getBillStatusBadge(bill, payment)}
                            {bill.autopay && (
                              <Badge variant="outline" className="text-slate-600">
                                AutoPay
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Amount</p>
                              <p className="font-semibold text-slate-900">
                                {formatCurrency(bill.typical_amount || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Due Date</p>
                              <p className="font-semibold text-slate-900">
                                {format(new Date(bill.next_due_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            {payment ? (
                              <div>
                                <p className="text-slate-500">Paid On</p>
                                <p className="font-semibold text-green-600">
                                  {format(new Date(payment.date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-slate-500">Status</p>
                                <p className="font-semibold text-orange-600">Unpaid</p>
                              </div>
                            )}
                            {payment && (
                              <div>
                                <p className="text-slate-500">Paid Amount</p>
                                <p className="font-semibold text-slate-900">
                                  {formatCurrency(payment.amount)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
