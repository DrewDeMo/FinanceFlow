'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { parseCSV, CSVRow, ColumnMapping, detectColumnMapping } from '@/lib/utils/csv-parser';
import { CSVMappingForm } from '@/components/import/CSVMappingForm';
import { useToast } from '@/hooks/use-toast';

type ImportStep = 'upload' | 'mapping' | 'processing' | 'complete';

interface ParsedData {
  headers: string[];
  rows: CSVRow[];
  detectedMapping: ColumnMapping;
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
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({
    imported: 0,
    duplicates: 0,
    errors: 0,
  });

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

  const handleStartImport = async () => {
    if (!user || !parsedData) return;

    if (!mapping.posted_date || !mapping.description || !mapping.amount) {
      toast({
        title: 'Missing required fields',
        description: 'Please map date, description, and amount columns',
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

      console.log('Starting import API call...', { uploadId: uploadRecord.data.id, rowCount: parsedData.rows.length });

      // Simulate progress updates during import
      const totalRows = parsedData.rows.length;
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          const next = prev + (100 / (totalRows / 10));
          return next >= 90 ? 90 : next;
        });
      }, 100);

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

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `Import failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('Import result:', result);

      setImportStats({
        imported: result.imported,
        duplicates: result.duplicates,
        errors: result.errors,
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
    setImportStats({ imported: 0, duplicates: 0, errors: 0 });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Import Transactions</h1>
        <p className="text-slate-600 mt-2">
          Upload a CSV file from your bank to import transactions
        </p>
      </div>

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file exported from your bank or financial institution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
                }`}
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
                  <Loader2 className="h-12 w-12 mx-auto text-slate-400 animate-spin mb-4" />
                ) : (
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-slate-400'
                    }`} />
                )}
                <p className={`text-lg font-medium mb-2 ${dragActive ? 'text-blue-700' : 'text-slate-900'
                  }`}>
                  {loading ? 'Parsing CSV...' : dragActive ? 'Drop file here' : 'Click to upload CSV file'}
                </p>
                <p className={`text-sm ${dragActive ? 'text-blue-600' : 'text-slate-600'
                  }`}>
                  {dragActive ? 'Release to upload' : 'or drag and drop your file here'}
                </p>
              </label>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && parsedData && (
        <CSVMappingForm
          headers={parsedData.headers}
          sampleRows={parsedData.rows.slice(0, 3)}
          detectedMapping={parsedData.detectedMapping}
          onMappingChange={setMapping}
          onAccountChange={setAccountId}
          onCancel={handleReset}
          onConfirm={handleStartImport}
          loading={loading}
        />
      )}

      {step === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Import</CardTitle>
            <CardDescription>
              Importing and categorizing your transactions...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Import Progress</span>
                <span className="font-medium text-slate-900">{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
              <span className="text-slate-600">
                {importProgress < 30 ? 'Reading transactions...' :
                  importProgress < 60 ? 'Processing data...' :
                    importProgress < 90 ? 'Categorizing transactions...' :
                      'Finalizing import...'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Import Complete
            </CardTitle>
            <CardDescription>
              Your transactions have been imported successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {importStats.imported}
                </div>
                <div className="text-sm text-green-700">Imported</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {importStats.duplicates}
                </div>
                <div className="text-sm text-yellow-700">Duplicates Skipped</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {importStats.errors}
                </div>
                <div className="text-sm text-red-700">Errors</div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Button onClick={() => window.location.href = '/dashboard/transactions'} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  View Transactions
                </Button>
                <Button onClick={() => window.location.href = '/dashboard/recurring'} variant="outline" className="flex-1">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  View Recurring Charges
                </Button>
              </div>
              <Button onClick={handleReset} variant="outline" className="w-full">
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
