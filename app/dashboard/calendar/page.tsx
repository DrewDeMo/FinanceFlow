'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    TrendingDown,
    Receipt,
    FileText,
    Calendar,
    Flame,
    Wallet,
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FinancialCalendar } from '@/components/calendar/FinancialCalendar';
import { DayDetailPanel } from '@/components/calendar/DayDetailPanel';

interface DayData {
    date: string;
    income: number;
    expenses: number;
    netCashflow: number;
    transactionCount: number;
    transactions: Array<{
        id: string;
        description: string;
        amount: number;
        merchant_key: string;
        category?: {
            name: string;
            color: string;
            icon: string;
        };
    }>;
    bills: Array<{
        merchant_key: string;
        merchant_name: string;
        typical_amount: number;
        status: string;
        paid_this_month: boolean;
    }>;
    hasNote: boolean;
    note?: {
        id: string;
        content: string;
    };
}

interface MonthSummary {
    totalIncome: number;
    totalExpenses: number;
    netCashflow: number;
    totalTransactions: number;
    billsDue: number;
    billsPaid: number;
    highestSpendingDay: string | null;
    highestSpendingAmount: number;
    averageDailySpending: number;
}

interface CalendarData {
    days: Record<string, DayData>;
    summary: MonthSummary;
    month: {
        year: number;
        month: number;
        startDate: string;
        endDate: string;
    };
}

export default function CalendarPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);

    useEffect(() => {
        if (user) {
            loadCalendarData();
        }
    }, [user, currentMonth]);

    const loadCalendarData = async () => {
        try {
            setLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No session');
            }

            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth() + 1;

            const response = await fetch(
                `/api/calendar?year=${year}&month=${month}`,
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch calendar data');
            }

            const data = await response.json();
            setCalendarData(data);

            // Update selected day data if a day is selected
            if (selectedDate && data.days[selectedDate]) {
                setSelectedDayData(data.days[selectedDate]);
            }
        } catch (error) {
            console.error('Error loading calendar data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load calendar data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDayClick = (date: string, dayData: DayData | null) => {
        setSelectedDate(date);
        setSelectedDayData(dayData);
    };

    const handleClosePanel = () => {
        setSelectedDate(null);
        setSelectedDayData(null);
    };

    const handleNoteUpdate = async (date: string, content: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No session');
            }

            const response = await fetch('/api/calendar/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ date, content }),
            });

            if (!response.ok) {
                throw new Error('Failed to save note');
            }

            toast({
                title: 'Success',
                description: content ? 'Note saved successfully' : 'Note deleted',
            });

            // Reload calendar data to get updated notes
            await loadCalendarData();
        } catch (error) {
            console.error('Error saving note:', error);
            toast({
                title: 'Error',
                description: 'Failed to save note',
                variant: 'destructive',
            });
            throw error;
        }
    };

    const handleNoteDelete = async (date: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No session');
            }

            const response = await fetch(`/api/calendar/notes?date=${date}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete note');
            }

            toast({
                title: 'Success',
                description: 'Note deleted',
            });

            await loadCalendarData();
        } catch (error) {
            console.error('Error deleting note:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete note',
                variant: 'destructive',
            });
            throw error;
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

    if (loading && !calendarData) {
        return (
            <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
                <div className="mb-8">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-[600px] rounded-xl" />
            </div>
        );
    }

    const summary = calendarData?.summary;

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    Financial Calendar
                </h1>
                <p className="text-muted-foreground mt-1">
                    Track your daily spending, bills, and financial notes
                </p>
            </div>

            {/* Month Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {/* Monthly Income */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(summary?.totalIncome || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Income</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Expenses */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
                                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                                    {formatCurrency(summary?.totalExpenses || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Expenses</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Net Cashflow */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center',
                                (summary?.netCashflow || 0) >= 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50'
                                    : 'bg-red-50 dark:bg-red-950/50'
                            )}>
                                <Wallet className={cn(
                                    'h-5 w-5',
                                    (summary?.netCashflow || 0) >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                )} />
                            </div>
                            <div>
                                <p className={cn(
                                    'text-lg font-semibold',
                                    (summary?.netCashflow || 0) >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                )}>
                                    {formatCurrency(summary?.netCashflow || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Net Cashflow</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bills Status */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-foreground">
                                    {summary?.billsPaid || 0}/{(summary?.billsPaid || 0) + (summary?.billsDue || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Bills Paid</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Highest Spending Day */}
                <Card className="hidden lg:block">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                                <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-foreground">
                                    {formatCurrency(summary?.highestSpendingAmount || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {summary?.highestSpendingDay
                                        ? `Highest: ${format(new Date(summary.highestSpendingDay), 'MMM d')}`
                                        : 'Highest Day'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar and Detail Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className={cn(
                    'lg:col-span-2',
                    selectedDate && 'hidden lg:block'
                )}>
                    <FinancialCalendar
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        days={calendarData?.days || {}}
                        onDayClick={handleDayClick}
                        selectedDate={selectedDate}
                        averageDailySpending={summary?.averageDailySpending || 0}
                    />
                </div>

                {/* Day Detail Panel */}
                <div className={cn(
                    'lg:col-span-1',
                    !selectedDate && 'hidden lg:block'
                )}>
                    {selectedDate ? (
                        <DayDetailPanel
                            selectedDate={selectedDate}
                            dayData={selectedDayData}
                            onClose={handleClosePanel}
                            onNoteUpdate={handleNoteUpdate}
                            onNoteDelete={handleNoteDelete}
                        />
                    ) : (
                        <Card className="h-full min-h-[500px] flex flex-col items-center justify-center">
                            <CardContent className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-1">
                                    Select a Day
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-[200px]">
                                    Click on any day in the calendar to view details, transactions, and add notes.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-6 p-4 rounded-xl border bg-card">
                <h3 className="text-sm font-medium text-foreground mb-3">Legend</h3>
                <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50" />
                        <span className="text-muted-foreground">Low Spending</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50" />
                        <span className="text-muted-foreground">Average Spending</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-100/50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50" />
                        <span className="text-muted-foreground">High Spending</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                            <FileText className="h-2 w-2 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-muted-foreground">Bill Due</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                            <FileText className="h-2 w-2 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-muted-foreground">Bill Paid</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                            <span className="text-violet-600 dark:text-violet-400 text-[8px]">📝</span>
                        </div>
                        <span className="text-muted-foreground">Has Note</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
