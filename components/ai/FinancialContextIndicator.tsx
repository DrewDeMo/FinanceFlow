'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Info, Calendar, TrendingUp, RefreshCw, CreditCard } from 'lucide-react';

export type ContextType = 'monthly' | 'yearly' | 'custom';

interface FinancialContextIndicatorProps {
    contextType: ContextType;
    onContextTypeChange?: (type: ContextType) => void;
    period?: string;
}

export function FinancialContextIndicator({
    contextType,
    onContextTypeChange,
    period,
}: FinancialContextIndicatorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const contextLabels: Record<ContextType, string> = {
        monthly: 'This Month',
        yearly: 'Last 12 Months',
        custom: 'Custom Range',
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-xs">
                    <Info className="h-3 w-3" />
                    <span className="hidden sm:inline">AI Context:</span>
                    <Badge variant="secondary" className="text-xs">
                        {contextLabels[contextType]}
                    </Badge>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-sm mb-2">What the AI can see</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                            The AI has access to aggregated summaries of your financial data, not individual transaction details.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            <span>Income and expense totals</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <CreditCard className="h-3 w-3 text-blue-500" />
                            <span>Spending by category</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <RefreshCw className="h-3 w-3 text-amber-500" />
                            <span>Active subscriptions and recurring charges</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <Calendar className="h-3 w-3 text-violet-500" />
                            <span>Month-over-month comparisons</span>
                        </div>
                    </div>

                    {onContextTypeChange && (
                        <div className="pt-2 border-t">
                            <p className="text-xs font-medium mb-2">Data Range</p>
                            <div className="flex gap-1">
                                <Button
                                    variant={contextType === 'monthly' ? 'default' : 'outline'}
                                    size="sm"
                                    className="text-xs flex-1"
                                    onClick={() => {
                                        onContextTypeChange('monthly');
                                        setIsOpen(false);
                                    }}
                                >
                                    This Month
                                </Button>
                                <Button
                                    variant={contextType === 'yearly' ? 'default' : 'outline'}
                                    size="sm"
                                    className="text-xs flex-1"
                                    onClick={() => {
                                        onContextTypeChange('yearly');
                                        setIsOpen(false);
                                    }}
                                >
                                    12 Months
                                </Button>
                            </div>
                        </div>
                    )}

                    {period && (
                        <div className="text-xs text-muted-foreground border-t pt-2">
                            Current period: {period}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
