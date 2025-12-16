'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDeleteAllData = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast({
        title: 'Invalid Confirmation',
        description: 'Please type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setIsDeleting(true);
    try {
      const tables = [
        'categorization_rules',
        'goals',
        'bills',
        'recurring_series',
        'transactions',
      ];

      for (const table of tables) {
        await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id);
      }

      toast({
        title: 'Success',
        description: 'All your data has been permanently deleted',
      });

      setDialogOpen(false);
      setDeleteConfirmation('');

      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete all data',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast({
      title: 'Contact Support',
      description: 'Please contact support to delete your account',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and data preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email Address</Label>
            <Input value={user?.email || ''} disabled className="mt-1.5" />
          </div>
          <div>
            <Label>User ID</Label>
            <Input value={user?.id || ''} disabled className="mt-1.5 font-mono text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <CardTitle className="text-red-900">Danger Zone</CardTitle>
              <CardDescription className="text-red-700">
                Irreversible and destructive actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-white rounded-lg border border-red-200">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900">Delete All Data</h3>
                <p className="text-sm text-slate-600">
                  Permanently delete all transactions, bills, recurring charges, goals, and rules.
                  Your account will remain active.
                </p>
              </div>
              <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="shrink-0"
                    onClick={() => setDeleteConfirmation('')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Delete All Data?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                          <strong>This action cannot be undone.</strong> All of your financial data will be permanently deleted:
                        </AlertDescription>
                      </Alert>

                      <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                        <li>All transactions</li>
                        <li>All bills and recurring charges</li>
                        <li>All financial goals</li>
                        <li>All categorization rules</li>
                      </ul>

                      <div className="space-y-2 pt-2">
                        <Label htmlFor="delete-confirm" className="text-slate-900 font-semibold">
                          Type <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                        </Label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="Type DELETE here"
                          className="font-mono"
                          autoComplete="off"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                      Cancel
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAllData}
                      disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete All Data'}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-red-200">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900">Delete Account</h3>
                <p className="text-sm text-slate-600">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 border-red-300 text-red-700 hover:bg-red-50"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
