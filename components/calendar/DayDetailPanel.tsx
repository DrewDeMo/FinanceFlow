'use client';

import * as React from 'react';
import {
    TrendingUp,
    TrendingDown,
    FileText,
    Receipt,
    StickyNote,
    Edit2,
    X,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle,
    Clock,
    Trash2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarNoteEditor } from './CalendarNoteEditor';

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

interface DayDetailPanelProps {
    selectedDate: string;
    dayData: DayData | null;
    onClose: () => void;
    onNoteUpdate: (date: string, content: string) => Promise<void>;
    onNoteDelete: (date: string) => Promise<void>;
}

export function DayDetailPanel({
    selectedDate,
    dayData,
    onClose,
    onNoteUpdate,
    onNoteDelete,
}: DayDetailPanelProps) {
    const [isEditingNote, setIsEditingNote] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(Math.abs(amount));
    };

    const handleSaveNote = async (content: string) => {
        setIsSaving(true);
        try {
            await onNoteUpdate(selectedDate, content);
            setIsEditingNote(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNote = async () => {
        setIsSaving(true);
        try {
            await onNoteDelete(selectedDate);
            setIsEditingNote(false);
        } finally {
            setIsSaving(false);
        }
    };

    const formattedDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0 pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">{formattedDate}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6 pb-6">
                    {/* Daily Summary */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs text-muted-foreground">Income</span>
                            </div>
                            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(dayData?.income || 0)}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-xs text-muted-foreground">Expenses</span>
                            </div>
                            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                                {formatCurrency(dayData?.expenses || 0)}
                            </p>
                        </div>
                    </div>

                    {/* Net Cashflow */}
                    {dayData && (dayData.income > 0 || dayData.expenses > 0) && (
                        <div className={cn(
                            'p-3 rounded-lg mb-4',
                            dayData.netCashflow >= 0
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30'
                                : 'bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30'
                        )}>
                            <p className="text-xs text-muted-foreground mb-1">Net Cashflow</p>
                            <p className={cn(
                                'text-xl font-semibold',
                                dayData.netCashflow >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                            )}>
                                {dayData.netCashflow >= 0 ? '+' : '-'}{formatCurrency(dayData.netCashflow)}
                            </p>
                        </div>
                    )}

                    {/* Notes Section */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <StickyNote className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-medium">Notes</h3>
                            </div>
                            {!isEditingNote && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditingNote(true)}
                                    className="h-7 text-xs"
                                >
                                    <Edit2 className="h-3 w-3 mr-1" />
                                    {dayData?.hasNote ? 'Edit' : 'Add'}
                                </Button>
                            )}
                        </div>

                        {isEditingNote ? (
                            <CalendarNoteEditor
                                initialContent={dayData?.note?.content || ''}
                                onSave={handleSaveNote}
                                onCancel={() => setIsEditingNote(false)}
                                onDelete={dayData?.hasNote ? handleDeleteNote : undefined}
                                isSaving={isSaving}
                            />
                        ) : dayData?.hasNote ? (
                            <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50">
                                <p className="text-sm text-foreground whitespace-pre-wrap">{dayData.note?.content}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No notes for this day</p>
                        )}
                    </div>

                    <Separator className="my-4" />

                    {/* Bills Due */}
                    {dayData?.bills && dayData.bills.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-medium">Bills Due</h3>
                            </div>
                            <div className="space-y-2">
                                {dayData.bills.map((bill) => (
                                    <div
                                        key={bill.merchant_key}
                                        className={cn(
                                            'p-3 rounded-lg border',
                                            bill.paid_this_month
                                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                                                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-foreground">{bill.merchant_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    ~{formatCurrency(bill.typical_amount)}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    bill.paid_this_month
                                                        ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400'
                                                        : 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400'
                                                )}
                                            >
                                                {bill.paid_this_month ? (
                                                    <>
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Paid
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Due
                                                    </>
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Transactions */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-medium">
                                Transactions ({dayData?.transactionCount || 0})
                            </h3>
                        </div>

                        {dayData?.transactions && dayData.transactions.length > 0 ? (
                            <div className="space-y-2">
                                {dayData.transactions.map((tx) => {
                                    const isIncome = tx.amount > 0;
                                    const IconComponent = tx.category
                                        ? ((LucideIcons as any)[tx.category.icon] || LucideIcons.Circle)
                                        : LucideIcons.Circle;

                                    return (
                                        <div
                                            key={tx.id}
                                            className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-border transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                        backgroundColor: tx.category?.color
                                                            ? `${tx.category.color}15`
                                                            : isIncome
                                                                ? 'rgb(236, 253, 245)'
                                                                : 'rgb(254, 242, 242)',
                                                    }}
                                                >
                                                    {tx.category ? (
                                                        <IconComponent
                                                            className="h-4 w-4"
                                                            style={{ color: tx.category.color }}
                                                        />
                                                    ) : isIncome ? (
                                                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {tx.description}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {tx.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs font-normal"
                                                                style={{
                                                                    borderColor: tx.category.color,
                                                                    color: tx.category.color,
                                                                }}
                                                            >
                                                                {tx.category.name}
                                                            </Badge>
                                                        )}
                                                        <span className="text-xs text-muted-foreground">
                                                            {tx.merchant_key}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span
                                                    className={cn(
                                                        'text-sm font-semibold tabular-nums',
                                                        isIncome
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-foreground'
                                                    )}
                                                >
                                                    {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No transactions on this day</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
