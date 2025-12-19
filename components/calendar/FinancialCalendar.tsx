'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, FileText, Receipt, TrendingUp, TrendingDown, StickyNote } from 'lucide-react';
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    getDay,
    isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

interface FinancialCalendarProps {
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    days: Record<string, DayData>;
    onDayClick: (date: string, dayData: DayData | null) => void;
    selectedDate: string | null;
    averageDailySpending: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function FinancialCalendar({
    currentMonth,
    onMonthChange,
    days,
    onDayClick,
    selectedDate,
    averageDailySpending,
}: FinancialCalendarProps) {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get the day of week the month starts on (0 = Sunday)
    const startDayOfWeek = getDay(monthStart);

    // Create empty cells for days before the month starts
    const emptyDays = Array(startDayOfWeek).fill(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getSpendingIntensity = (expenses: number): string => {
        if (expenses === 0) return '';

        // Calculate intensity based on average daily spending
        const ratio = expenses / (averageDailySpending || expenses);

        if (ratio <= 0.5) return 'bg-emerald-50 dark:bg-emerald-950/30'; // Very low spending
        if (ratio <= 0.8) return 'bg-emerald-100/50 dark:bg-emerald-900/20'; // Low spending
        if (ratio <= 1.2) return 'bg-amber-50 dark:bg-amber-950/30'; // Average spending
        if (ratio <= 1.5) return 'bg-orange-100/50 dark:bg-orange-900/30'; // Above average
        if (ratio <= 2) return 'bg-red-100/50 dark:bg-red-900/30'; // High spending
        return 'bg-red-200/50 dark:bg-red-800/30'; // Very high spending
    };

    const handlePrevMonth = () => {
        onMonthChange(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        onMonthChange(addMonths(currentMonth, 1));
    };

    return (
        <TooltipProvider>
            <div className="rounded-xl border bg-card">
                {/* Calendar Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevMonth}
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold text-foreground">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNextMonth}
                        className="h-8 w-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b">
                    {WEEKDAYS.map((day) => (
                        <div
                            key={day}
                            className="p-2 text-center text-sm font-medium text-muted-foreground"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                    {/* Empty cells for days before month starts */}
                    {emptyDays.map((_, index) => (
                        <div key={`empty-${index}`} className="min-h-[100px] border-b border-r bg-muted/20" />
                    ))}

                    {/* Day cells */}
                    {daysInMonth.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayData = days[dateStr];
                        const isSelected = selectedDate === dateStr;
                        const isCurrentDay = isToday(day);
                        const hasIncome = dayData?.income > 0;
                        const hasExpenses = dayData?.expenses > 0;
                        const hasBills = dayData?.bills && dayData.bills.length > 0;
                        const hasUnpaidBills = dayData?.bills?.some(b => !b.paid_this_month);
                        const hasNote = dayData?.hasNote;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => onDayClick(dateStr, dayData || null)}
                                className={cn(
                                    'min-h-[100px] p-2 border-b border-r cursor-pointer transition-all hover:bg-muted/50',
                                    isSelected && 'ring-2 ring-primary ring-inset',
                                    isCurrentDay && 'bg-primary/5',
                                    dayData && getSpendingIntensity(dayData.expenses)
                                )}
                            >
                                {/* Day number and indicators */}
                                <div className="flex items-start justify-between mb-1">
                                    <span
                                        className={cn(
                                            'inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full',
                                            isCurrentDay && 'bg-primary text-primary-foreground',
                                            isSelected && !isCurrentDay && 'bg-muted'
                                        )}
                                    >
                                        {format(day, 'd')}
                                    </span>

                                    {/* Indicator icons */}
                                    <div className="flex items-center gap-0.5">
                                        {hasNote && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                                                        <StickyNote className="h-2.5 w-2.5 text-violet-600 dark:text-violet-400" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-[200px]">
                                                    <p className="text-xs">{dayData?.note?.content}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                        {hasBills && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={cn(
                                                        'w-4 h-4 rounded-full flex items-center justify-center',
                                                        hasUnpaidBills
                                                            ? 'bg-amber-100 dark:bg-amber-900/50'
                                                            : 'bg-emerald-100 dark:bg-emerald-900/50'
                                                    )}>
                                                        <FileText className={cn(
                                                            'h-2.5 w-2.5',
                                                            hasUnpaidBills
                                                                ? 'text-amber-600 dark:text-amber-400'
                                                                : 'text-emerald-600 dark:text-emerald-400'
                                                        )} />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <div className="text-xs">
                                                        {dayData?.bills?.map(b => (
                                                            <div key={b.merchant_key} className="flex items-center gap-1">
                                                                <span>{b.merchant_name}</span>
                                                                <span className={b.paid_this_month ? 'text-emerald-500' : 'text-amber-500'}>
                                                                    {b.paid_this_month ? '✓' : '•'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>

                                {/* Transaction summary */}
                                {dayData && (dayData.transactionCount > 0 || hasIncome) && (
                                    <div className="space-y-1">
                                        {hasIncome && (
                                            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                                <TrendingUp className="h-3 w-3" />
                                                <span className="font-medium">
                                                    +{formatCurrency(dayData.income)}
                                                </span>
                                            </div>
                                        )}
                                        {hasExpenses && (
                                            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                                <TrendingDown className="h-3 w-3" />
                                                <span className="font-medium">
                                                    -{formatCurrency(dayData.expenses)}
                                                </span>
                                            </div>
                                        )}
                                        {dayData.transactionCount > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Receipt className="h-3 w-3" />
                                                <span>{dayData.transactionCount} txn{dayData.transactionCount > 1 ? 's' : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}
