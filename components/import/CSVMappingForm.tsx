'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CSVRow, ColumnMapping } from '@/lib/utils/csv-parser';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Tag,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CSVMappingFormProps {
  headers: string[];
  sampleRows: CSVRow[];
  detectedMapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onAccountChange: (accountId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function CSVMappingForm({
  headers,
  sampleRows,
  detectedMapping,
  onMappingChange,
  onAccountChange,
  onCancel,
  onConfirm,
  loading,
}: CSVMappingFormProps) {
  const { user } = useAuth();
  const [mapping, setMapping] = useState<ColumnMapping>(detectedMapping);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  useEffect(() => {
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('accounts')
      .select('id, name, type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('type', { ascending: true });

    if (data) {
      setAccounts(data);
      const checkingAccount = data.find(acc => acc.type === 'checking');
      if (checkingAccount) {
        setSelectedAccount(checkingAccount.id);
        onAccountChange(checkingAccount.id);
      } else if (data.length > 0) {
        setSelectedAccount(data[0].id);
        onAccountChange(data[0].id);
      }
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const newMapping = { ...mapping, [field]: value === 'none' ? undefined : value };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    onAccountChange(accountId);
  };

  const isValid = mapping.posted_date && mapping.description && mapping.amount;
  const autoDetectedFields = Object.keys(detectedMapping).filter(k => detectedMapping[k as keyof ColumnMapping]);

  return (
    <div className="space-y-6">
      {/* Auto-detection Banner */}
      {autoDetectedFields.length > 0 && (
        <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-purple-700 dark:text-purple-300">
            <span className="font-semibold">Auto-detected {autoDetectedFields.length} column{autoDetectedFields.length !== 1 ? 's' : ''}</span>
            {' '} — We've automatically matched some columns based on common header names. Please verify the mappings below.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            Map CSV Columns
          </CardTitle>
          <CardDescription>
            Match your CSV columns to the required fields for import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Account Selection */}
          <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <Label htmlFor="account" className="text-base font-semibold">
                Account
              </Label>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select which account these transactions are from
            </p>
            <Select value={selectedAccount} onValueChange={handleAccountChange}>
              <SelectTrigger id="account" className="max-w-md">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span>{account.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {account.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No accounts found. You can still import without selecting an account.
              </p>
            )}
          </div>

          {/* Column Mappings */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Column Mappings</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Posted Date */}
              <div className={cn(
                'space-y-2 p-4 rounded-lg border-2 transition-all',
                mapping.posted_date
                  ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                  : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
              )}>
                <Label htmlFor="posted_date" className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Posted Date
                  <span className="text-red-500">*</span>
                  {mapping.posted_date && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                  {detectedMapping.posted_date === mapping.posted_date && mapping.posted_date && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                      Auto
                    </Badge>
                  )}
                </Label>
                <Select
                  value={mapping.posted_date || 'none'}
                  onValueChange={(v) => handleMappingChange('posted_date', v)}
                >
                  <SelectTrigger id="posted_date" className="bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h && h.trim()).map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className={cn(
                'space-y-2 p-4 rounded-lg border-2 transition-all',
                mapping.description
                  ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                  : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
              )}>
                <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Description
                  <span className="text-red-500">*</span>
                  {mapping.description && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                  {detectedMapping.description === mapping.description && mapping.description && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                      Auto
                    </Badge>
                  )}
                </Label>
                <Select
                  value={mapping.description || 'none'}
                  onValueChange={(v) => handleMappingChange('description', v)}
                >
                  <SelectTrigger id="description" className="bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h && h.trim()).map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className={cn(
                'space-y-2 p-4 rounded-lg border-2 transition-all',
                mapping.amount
                  ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                  : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
              )}>
                <Label htmlFor="amount" className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Amount
                  <span className="text-red-500">*</span>
                  {mapping.amount && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                  {detectedMapping.amount === mapping.amount && mapping.amount && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                      Auto
                    </Badge>
                  )}
                </Label>
                <Select
                  value={mapping.amount || 'none'}
                  onValueChange={(v) => handleMappingChange('amount', v)}
                >
                  <SelectTrigger id="amount" className="bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h && h.trim()).map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className={cn(
                'space-y-2 p-4 rounded-lg border-2 transition-all',
                'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
              )}>
                <Label htmlFor="category" className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Category
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                  {mapping.category && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                  {detectedMapping.category === mapping.category && mapping.category && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                      Auto
                    </Badge>
                  )}
                </Label>
                <Select
                  value={mapping.category || 'none'}
                  onValueChange={(v) => handleMappingChange('category', v)}
                >
                  <SelectTrigger id="category" className="bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {headers.filter(h => h && h.trim()).map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-t-lg">
          <CardTitle className="text-lg">Data Preview</CardTitle>
          <CardDescription>
            First {sampleRows.length} rows of your CSV with current mapping
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Date
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Description
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Amount
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Category
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="font-medium">
                      {mapping.posted_date ? (
                        <span className="text-slate-900 dark:text-slate-100">{row[mapping.posted_date]}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not mapped</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {mapping.description ? (
                        <span className="text-slate-900 dark:text-slate-100">{row[mapping.description]}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not mapped</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {mapping.amount ? (
                        <span className={cn(
                          'font-medium',
                          row[mapping.amount]?.startsWith('-')
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        )}>
                          {row[mapping.amount]}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not mapped</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapping.category ? (
                        <Badge variant="secondary" className="text-xs">
                          {row[mapping.category] || 'N/A'}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 italic text-sm">Auto-categorize</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Validation Message */}
      {!isValid && (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please map all required fields (Date, Description, and Amount) before continuing.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className={cn(
            'flex-1 text-white',
            isValid
              ? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25'
              : 'bg-slate-400 cursor-not-allowed'
          )}
          disabled={!isValid || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Continue to Preview
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
