'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCSV, CSVRow, ColumnMapping, detectColumnMapping } from '@/lib/utils/csv-parser';
import { CSVMappingForm } from '@/components/import/CSVMappingForm';
import { ImportStepIndicator, ImportStep } from '@/components/import/ImportStepIndicator';
import { ImportPreview } from '@/components/import/ImportPreview';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ParsedData {
  headers: string[];
  rows: CSVRow[];
  detectedMapping: ColumnMapping;
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
  duplicateDetails: Array<{
    date: string;
    description: string;
    amount: number;
    fingerprint: string;
    isDuplicate: boolean;
  }>;
  newTransactionDetails: Array<{
    date: string;
    description: string;
    amount: number;
    fingerprint: string;
    isDuplicate: boolean;
  }>;
  errorDetails: string[];
}

export default function ImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [accountId, setAccountId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [importStats, setImportStats] = useState({
    imported: 0,
    duplicates: 0,
    errors: 0,
    autoCategorized: 0,
    uncategorized: 0,
  });
  const [showSkippedDuplicates, setShowSkippedDuplicates] = useState(false);

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);

      if (parsed.rows.length === 0) {
        throw new Error('CSV file contains no data rows');
      }

      const detected = detectColumnMapping(parsed.headers);

      setParsedData({
        headers: parsed.headers,
        rows: parsed.rows,
        detectedMapping: detected,
      });

      setMapping(detected);
      setStep('mapping');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    await processFile(droppedFile);
  };

  const handleAnalyze = async () => {
    if (!user || !parsedData) return;

    if (!mapping.posted_date || !mapping.description || !mapping.amount) {
      toast({
        title: 'Missing required fields',
        description: 'Please map date, description, and amount columns',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          rows: parsedData.rows,
          mapping,
          accountId: accountId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      toast({
        title: 'Analysis failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStartImport = async () => {
    if (!user || !parsedData || !analysisResult) return;

    if (analysisResult.newTransactions === 0) {
      toast({
        title: 'Nothing to import',
        description: 'All transactions in this file are duplicates',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setStep('processing');
    setError(null);
    setImportProgress(0);

    try {
      const uploadRecord = await (supabase
        .from('uploads')
        .insert as any)({
          user_id: user.id,
          account_id: accountId || null,
          filename: file?.name || 'unknown.csv',
          status: 'importing',
          total_rows: parsedData.rows.length,
          column_mapping: mapping,
        })
        .select()
        .single();

      if (uploadRecord.error) throw uploadRecord.error;

      // Progress simulation with better feedback
      const totalRows = parsedData.rows.length;
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) currentProgress = 90;
        setImportProgress(currentProgress);
      }, 200);

      const response = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadRecord.data.id,
          rows: parsedData.rows,
          mapping,
          accountId: accountId || null,
        }),
      });

      clearInterval(progressInterval);
      setImportProgress(95);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Import failed with status ${response.status}`);
      }

      const result = await response.json();

      setImportStats({
        imported: result.imported,
        duplicates: result.duplicates,
        errors: result.errors,
        autoCategorized: result.autoCategorized || 0,
        uncategorized: result.uncategorized || 0,
      });

      await (supabase
        .from('uploads')
        .update as any)({
          status: 'completed',
          imported_count: result.imported,
          duplicate_count: result.duplicates,
          error_count: result.errors,
          completed_at: new Date().toISOString(),
        })
        .eq('id', uploadRecord.data.id);

      setImportProgress(100);

      if (result.imported > 0) {
        await fetch('/api/recurring/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
      }

      setStep('complete');
      toast({
        title: 'Import complete',
        description: `Successfully imported ${result.imported} transactions`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('preview'); // Go back to preview on error
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setMapping({});
    setAccountId('');
    setError(null);
    setDragActive(false);
    setImportProgress(0);
    setAnalysisResult(null);
    setImportStats({ imported: 0, duplicates: 0, errors: 0, autoCategorized: 0, uncategorized: 0 });
    setShowSkippedDuplicates(false);
  };

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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Import Transactions
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Upload a CSV file from your bank to import transactions
          </p>
        </div>
        {step !== 'upload' && step !== 'processing' && (
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Start Over
          </Button>
        )}
      </div>

      {/* Step Indicator */}
      <ImportStepIndicator currentStep={step} />

      {/* Upload Step */}
      {step === 'upload' && (
        <Card className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Upload className="h-4 w-4 text-white" />
              </div>
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Select a CSV file exported from your bank or financial institution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer',
                dragActive
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                  : 'border-slate-300 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
                disabled={loading}
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                {loading ? (
                  <Loader2 className="h-16 w-16 mx-auto text-purple-500 animate-spin mb-4" />
                ) : (
                  <div className={cn(
                    'h-16 w-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all',
                    dragActive
                      ? 'bg-purple-100 dark:bg-purple-900/50'
                      : 'bg-slate-100 dark:bg-slate-800'
                  )}>
                    <Upload className={cn(
                      'h-8 w-8 transition-colors',
                      dragActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'
                    )} />
                  </div>
                )}
                <p className={cn(
                  'text-lg font-semibold mb-2',
                  dragActive ? 'text-purple-700 dark:text-purple-300' : 'text-slate-900 dark:text-slate-100'
                )}>
                  {loading ? 'Parsing CSV...' : dragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
                </p>
                <p className={cn(
                  'text-sm',
                  dragActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'
                )}>
                  {dragActive ? 'Release to upload' : 'Supports CSV files from most banks'}
                </p>
              </label>
            </div>

            {/* Duplicate Detection Info */}
            <Alert className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-300">Smart Duplicate Detection</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Don't worry about importing the same transactions twice! Our system automatically detects and skips duplicates based on date, amount, and merchant information.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mapping Step */}
      {step === 'mapping' && parsedData && (
        <div className="space-y-6">
          <CSVMappingForm
            headers={parsedData.headers}
            sampleRows={parsedData.rows.slice(0, 3)}
            detectedMapping={parsedData.detectedMapping}
            onMappingChange={setMapping}
            onAccountChange={setAccountId}
            onCancel={handleReset}
            onConfirm={handleAnalyze}
            loading={analyzing}
          />
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && analysisResult && (
        <ImportPreview
          analysis={analysisResult}
          onConfirm={handleStartImport}
          onBack={() => setStep('mapping')}
          loading={loading}
        />
      )}

      {/* Processing Step */}
      {step === 'processing' && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
              Processing Import
            </CardTitle>
            <CardDescription>
              Importing and categorizing your transactions...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Import Progress</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{Math.round(importProgress)}%</span>
              </div>
              <div className="relative">
                <Progress value={importProgress} className="h-3" />
                <div
                  className="absolute inset-0 h-3 rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 opacity-20"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  {importProgress < 30 && <FileText className="h-5 w-5 text-purple-500" />}
                  {importProgress >= 30 && importProgress < 60 && <TrendingUp className="h-5 w-5 text-blue-500" />}
                  {importProgress >= 60 && importProgress < 90 && <CheckCircle2 className="h-5 w-5 text-indigo-500" />}
                  {importProgress >= 90 && <Loader2 className="h-5 w-5 text-green-500 animate-spin" />}
                </div>
                <span className="font-medium">
                  {importProgress < 30 ? 'Reading transactions...' :
                    importProgress < 60 ? 'Processing data...' :
                      importProgress < 90 ? 'Categorizing transactions...' :
                        'Finalizing import...'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="space-y-6">
          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-green-800 dark:text-green-200">Import Complete!</span>
                  <p className="text-sm font-normal text-green-700 dark:text-green-300 mt-1">
                    Your transactions have been imported successfully
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {importStats.imported}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">Imported</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-purple-200 dark:border-purple-700">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {importStats.autoCategorized}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Auto-Categorized</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-orange-200 dark:border-orange-700">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {importStats.uncategorized}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">Need Review</div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importStats.duplicates}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Duplicates Skipped</div>
                </div>
              </div>

              {/* Smart Categorization Info */}
              {importStats.autoCategorized > 0 && (
                <Alert className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
                  <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <AlertTitle className="text-purple-800 dark:text-purple-300">Smart Categorization Active</AlertTitle>
                  <AlertDescription className="text-purple-700 dark:text-purple-400">
                    {importStats.autoCategorized} transaction{importStats.autoCategorized !== 1 ? 's were' : ' was'} automatically categorized based on your previous categorization choices.
                    {importStats.uncategorized > 0 && ` Review the ${importStats.uncategorized} uncategorized transaction${importStats.uncategorized !== 1 ? 's' : ''} to teach the system.`}
                  </AlertDescription>
                </Alert>
              )}

              {importStats.uncategorized > 0 && importStats.autoCategorized === 0 && (
                <Alert className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
                  <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertTitle className="text-orange-800 dark:text-orange-300">New Merchants Detected</AlertTitle>
                  <AlertDescription className="text-orange-700 dark:text-orange-400">
                    {importStats.uncategorized} transaction{importStats.uncategorized !== 1 ? 's are' : ' is'} from merchants you haven't categorized before.
                    Categorize them once and future imports will automatically learn your preferences.
                  </AlertDescription>
                </Alert>
              )}

              {/* Date Range Info */}
              {analysisResult?.dateRange && (
                <div className="flex items-center justify-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div className="text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Date Range: </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(analysisResult.dateRange.earliest)} — {formatDate(analysisResult.dateRange.latest)}
                    </span>
                  </div>
                </div>
              )}

              {/* Skipped Duplicates Details */}
              {importStats.duplicates > 0 && analysisResult?.duplicateDetails && (
                <Card className="border-yellow-200 dark:border-yellow-800">
                  <CardHeader
                    className="cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-950/30 transition-colors py-3"
                    onClick={() => setShowSkippedDuplicates(!showSkippedDuplicates)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-medium text-yellow-800 dark:text-yellow-200">
                          View {importStats.duplicates} Skipped Duplicate{importStats.duplicates !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {showSkippedDuplicates ? (
                        <ChevronUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                  </CardHeader>
                  {showSkippedDuplicates && (
                    <CardContent className="pt-0">
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
                            {analysisResult.duplicateDetails.slice(0, 20).map((tx, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-slate-600 dark:text-slate-400">
                                  {formatDate(tx.date)}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-slate-700 dark:text-slate-300">
                                  {tx.description}
                                </TableCell>
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
                        {importStats.duplicates > 20 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
                            Showing first 20 of {importStats.duplicates} duplicates
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button
                    onClick={() => window.location.href = '/dashboard/transactions'}
                    className="flex-1 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Transactions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/dashboard/recurring'}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    View Recurring
                  </Button>
                </div>
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
