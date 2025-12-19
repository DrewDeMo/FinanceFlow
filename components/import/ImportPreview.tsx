'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ChevronDown,
    ChevronUp,
    FileCheck,
    Copy,
    Calendar,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyzedTransaction {
    date: string;
    description: string;
    amount: number;
    fingerprint: string;
    isDuplicate: boolean;
}

interface AnalysisResult {
    totalRows: number;
    newTransactions: number;
    duplicates: number;
    errors: number;
    dateRange: {
        earliest: string | null;
        latest: string | null;
    };
    duplicateDetails: AnalyzedTransaction[];
    newTransactionDetails: AnalyzedTransaction[];
    errorDetails: string[];
}

interface ImportPreviewProps {
    analysis: AnalysisResult;
    onConfirm: () => void;
    onBack: () => void;
    loading: boolean;
}

export function ImportPreview({ analysis, onConfirm, onBack, loading }: ImportPreviewProps) {
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [showNewTransactions, setShowNewTransactions] = useState(false);
    const [showErrors, setShowErrors] = useState(false);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(Math.abs(amount));
    };

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Duplicate Detection Active</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                    Transactions are identified by a unique fingerprint (date + amount + merchant).
                    If you re-import the same transactions, they will be automatically skipped to prevent duplicates.
                </AlertDescription>
            </Alert>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">New Transactions</p>
                                <p className="text-3xl font-bold text-green-800 dark:text-green-200">{analysis.newTransactions}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-200 dark:border-yellow-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Duplicates</p>
                                <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">{analysis.duplicates}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                                <Copy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-700 dark:text-red-300">Errors</p>
                                <p className="text-3xl font-bold text-red-800 dark:text-red-200">{analysis.errors}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Date Range</p>
                                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                                    {formatDate(analysis.dateRange.earliest)}
                                </p>
                                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                                    → {formatDate(analysis.dateRange.latest)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Action Message */}
            {analysis.newTransactions > 0 ? (
                <Card className="border-2 border-green-300 dark:border-green-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <FileCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                                    Ready to Import {analysis.newTransactions} Transaction{analysis.newTransactions !== 1 ? 's' : ''}
                                </h3>
                                <p className="text-green-700 dark:text-green-300">
                                    {analysis.duplicates > 0
                                        ? `${analysis.duplicates} duplicate${analysis.duplicates !== 1 ? 's' : ''} will be skipped.`
                                        : 'No duplicates detected in your file.'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Alert variant="destructive" className="border-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Nothing to Import</AlertTitle>
                    <AlertDescription>
                        All {analysis.duplicates} transactions in this file already exist in your account.
                        {analysis.errors > 0 && ` Additionally, ${analysis.errors} rows had errors.`}
                    </AlertDescription>
                </Alert>
            )}

            {/* Expandable Details Sections */}
            {analysis.duplicates > 0 && (
                <Card>
                    <CardHeader
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => setShowDuplicates(!showDuplicates)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                                    {analysis.duplicates} Duplicates
                                </Badge>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    These transactions already exist and will be skipped
                                </span>
                            </div>
                            {showDuplicates ? (
                                <ChevronUp className="h-5 w-5 text-slate-500" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-slate-500" />
                            )}
                        </div>
                    </CardHeader>
                    {showDuplicates && (
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysis.duplicateDetails.map((tx, i) => (
                                            <TableRow key={i} className="text-yellow-700 dark:text-yellow-400">
                                                <TableCell>{formatDate(tx.date)}</TableCell>
                                                <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                                                <TableCell className={cn(
                                                    'text-right font-medium',
                                                    tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                )}>
                                                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {analysis.duplicates > 50 && (
                                    <p className="text-sm text-slate-500 mt-2 text-center">
                                        Showing first 50 of {analysis.duplicates} duplicates
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {analysis.newTransactions > 0 && (
                <Card>
                    <CardHeader
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => setShowNewTransactions(!showNewTransactions)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                    {analysis.newTransactions} New
                                </Badge>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    Preview of transactions that will be imported
                                </span>
                            </div>
                            {showNewTransactions ? (
                                <ChevronUp className="h-5 w-5 text-slate-500" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-slate-500" />
                            )}
                        </div>
                    </CardHeader>
                    {showNewTransactions && (
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysis.newTransactionDetails.map((tx, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{formatDate(tx.date)}</TableCell>
                                                <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                                                <TableCell className={cn(
                                                    'text-right font-medium',
                                                    tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                )}>
                                                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {analysis.newTransactions > 50 && (
                                    <p className="text-sm text-slate-500 mt-2 text-center">
                                        Showing first 50 of {analysis.newTransactions} new transactions
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {analysis.errors > 0 && (
                <Card className="border-red-200 dark:border-red-800">
                    <CardHeader
                        className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        onClick={() => setShowErrors(!showErrors)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="destructive">
                                    {analysis.errors} Errors
                                </Badge>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    These rows could not be parsed
                                </span>
                            </div>
                            {showErrors ? (
                                <ChevronUp className="h-5 w-5 text-slate-500" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-slate-500" />
                            )}
                        </div>
                    </CardHeader>
                    {showErrors && (
                        <CardContent>
                            <ul className="space-y-1 text-sm text-red-700 dark:text-red-400">
                                {analysis.errorDetails.map((error, i) => (
                                    <li key={i}>• {error}</li>
                                ))}
                            </ul>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
                <Button
                    onClick={onBack}
                    variant="outline"
                    className="flex-1"
                    disabled={loading}
                >
                    Back to Mapping
                </Button>
                <Button
                    onClick={onConfirm}
                    className={cn(
                        'flex-1 text-white',
                        analysis.newTransactions > 0
                            ? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25'
                            : 'bg-slate-400 cursor-not-allowed'
                    )}
                    disabled={loading || analysis.newTransactions === 0}
                >
                    {loading ? 'Importing...' : `Import ${analysis.newTransactions} Transaction${analysis.newTransactions !== 1 ? 's' : ''}`}
                </Button>
            </div>
        </div>
    );
}
