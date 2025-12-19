'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, CheckCircle2, AlertCircle, Database, Bot, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, best for complex analysis' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Balance of speed and capability' },
];

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

  // AI Model Settings
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingModel, setIsSavingModel] = useState(false);

  // Load user's AI preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
          .from('user_ai_preferences')
          .select('preferred_model')
          .eq('user_id', user.id)
          .single();

        if (data?.preferred_model) {
          setSelectedModel(data.preferred_model);
        }
      } catch (error) {
        console.error('Error loading AI preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [user]);

  const handleModelChange = async (modelId: string) => {
    if (!user) return;
    setIsSavingModel(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      // Upsert the preference
      const { error } = await supabase
        .from('user_ai_preferences')
        .upsert({
          user_id: user.id,
          preferred_model: modelId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setSelectedModel(modelId);
      toast.success('AI model preference saved');
    } catch (error) {
      console.error('Error saving model preference:', error);
      toast.error('Failed to save model preference');
    } finally {
      setIsSavingModel(false);
    }
  };

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

        {/* AI Assistant Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-500" />
              AI Financial Assistant
            </CardTitle>
            <CardDescription>
              Configure your AI assistant preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Model</label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose which AI model to use for financial analysis. More capable models provide
                better analysis but may be slower.
              </p>
              <Select
                value={selectedModel}
                onValueChange={handleModelChange}
                disabled={isLoadingPreferences || isSavingModel}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSavingModel && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Saving...
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-violet-900 dark:text-violet-200">
                    What the AI can help with
                  </p>
                  <ul className="text-sm text-violet-700 dark:text-violet-300 mt-1 space-y-1">
                    <li>• Analyze your spending patterns and trends</li>
                    <li>• Identify opportunities to save money</li>
                    <li>• Review subscriptions and recurring charges</li>
                    <li>• Answer questions about your finances</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
