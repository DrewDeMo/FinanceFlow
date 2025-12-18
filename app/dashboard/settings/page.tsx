'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    total?: number;
    updated?: number;
    unchanged?: number;
    message?: string;
  } | null>(null);

  const handleRegenerateMerchantKeys = async () => {
    if (!user) return;

    setIsRegenerating(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch('/api/transactions/regenerate-merchant-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success(data.message || 'Merchant keys regenerated successfully!');
      } else {
        throw new Error(data.error || 'Failed to regenerate merchant keys');
      }
    } catch (error) {
      console.error('Error regenerating merchant keys:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate merchant keys');
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and application settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Merchant Key Regeneration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Merchant Normalization
            </CardTitle>
            <CardDescription>
              Update how merchant names are grouped for better transaction matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                If you're seeing Amazon, Starbucks, or other merchants with slightly different names
                not grouping together, this tool will fix it by regenerating the merchant keys for all
                your existing transactions using the improved normalization logic.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Examples of what gets fixed:</strong>
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>AMAZON.COM*TM0QZ6HK3, AMAZON MKTPL*, AMAZON MARK* → all become "AMAZON"</li>
                <li>STARBUCKS #1234, STARBUCKS STORE 5678 → all become "STARBUCKS"</li>
                <li>Removes transaction codes, reference numbers, and location suffixes</li>
              </ul>
            </div>

            {result && (
              <Alert className={result.success ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30' : 'border-red-200 bg-red-50 dark:bg-red-950/30'}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <AlertDescription>
                  <p className="font-medium mb-1">{result.message}</p>
                  {result.total !== undefined && (
                    <div className="text-sm space-y-1 mt-2">
                      <p>Total transactions: {result.total}</p>
                      <p className="text-emerald-600 dark:text-emerald-400">Updated: {result.updated}</p>
                      <p className="text-muted-foreground">Already correct: {result.unchanged}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleRegenerateMerchantKeys}
                disabled={isRegenerating}
                className="gap-2"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate Merchant Keys
                  </>
                )}
              </Button>
              {result && result.success && (
                <p className="text-sm text-muted-foreground">
                  ✓ Completed successfully
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <strong>Note:</strong> This is safe to run multiple times. New imports automatically use
                the improved normalization, so you only need to run this once to fix existing transactions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Future settings sections can go here */}
      </div>
    </div>
  );
}
