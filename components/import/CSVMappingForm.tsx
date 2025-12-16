'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CSVRow, ColumnMapping } from '@/lib/utils/csv-parser';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { CheckCircle2 } from 'lucide-react';

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
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  useEffect(() => {
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (data) {
      setAccounts(data);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const newMapping = { ...mapping, [field]: value === 'none' ? undefined : value };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const handleAccountChange = (accountId: string) => {
    const actualAccountId = accountId === 'none' ? '' : accountId;
    setSelectedAccount(actualAccountId);
    onAccountChange(actualAccountId);
  };

  const isValid = mapping.posted_date && mapping.description && mapping.amount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Map CSV Columns</CardTitle>
          <CardDescription>
            Match your CSV columns to the required fields. We've detected some automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 pb-4 border-b">
            <Label htmlFor="account" className="text-base font-semibold">
              Account
            </Label>
            <p className="text-sm text-slate-600 mb-2">
              Select which account these transactions are from
            </p>
            <Select value={selectedAccount || 'none'} onValueChange={handleAccountChange}>
              <SelectTrigger id="account" className="max-w-md">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="posted_date" className="flex items-center gap-2">
                Posted Date <span className="text-red-500">*</span>
                {mapping.posted_date && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </Label>
              <Select
                value={mapping.posted_date || 'none'}
                onValueChange={(v) => handleMappingChange('posted_date', v)}
              >
                <SelectTrigger id="posted_date">
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

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                Description <span className="text-red-500">*</span>
                {mapping.description && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </Label>
              <Select
                value={mapping.description || 'none'}
                onValueChange={(v) => handleMappingChange('description', v)}
              >
                <SelectTrigger id="description">
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

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                Amount <span className="text-red-500">*</span>
                {mapping.amount && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </Label>
              <Select
                value={mapping.amount || 'none'}
                onValueChange={(v) => handleMappingChange('amount', v)}
              >
                <SelectTrigger id="amount">
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

            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Select
                value={mapping.category || 'none'}
                onValueChange={(v) => handleMappingChange('category', v)}
              >
                <SelectTrigger id="category">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            First 3 rows of your CSV with detected mapping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {mapping.posted_date ? row[mapping.posted_date] : '-'}
                    </TableCell>
                    <TableCell>
                      {mapping.description ? row[mapping.description] : '-'}
                    </TableCell>
                    <TableCell>
                      {mapping.amount ? row[mapping.amount] : '-'}
                    </TableCell>
                    <TableCell>
                      {mapping.category ? row[mapping.category] : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={onCancel} variant="outline" className="flex-1" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="flex-1"
          disabled={!isValid || loading}
        >
          {loading ? 'Processing...' : 'Start Import'}
        </Button>
      </div>
    </div>
  );
}
