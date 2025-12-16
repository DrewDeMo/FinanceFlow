'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Download, Filter, Edit2, Receipt, Sparkles, Users, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  posted_date: string;
  description: string;
  amount: number;
  category_id: string | null;
  category?: { name: string; color: string; icon: string };
  account_id: string | null;
  account?: { name: string; type: string };
  merchant_key: string;
  notes: string | null;
  classification_source: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    category_id: '',
    notes: '',
    applyToAll: false
  });
  const [similarTransactionsCount, setSimilarTransactionsCount] = useState(0);
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [transactionsRes, categoriesRes, accountsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            id,
            posted_date,
            description,
            amount,
            category_id,
            account_id,
            merchant_key,
            notes,
            classification_source,
            categories:category_id (name, color, icon),
            accounts:account_id (name, type)
          `)
          .eq('user_id', user.id)
          .order('posted_date', { ascending: false })
          .limit(100),
        supabase
          .from('categories')
          .select('*')
          .or(`user_id.eq.${user.id},is_system.eq.true`)
          .order('name'),
        supabase
          .from('accounts')
          .select('id, name, type')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('name'),
      ]);

      if (transactionsRes.data) {
        const formatted = transactionsRes.data.map((t: any) => ({
          ...t,
          category: Array.isArray(t.categories) ? t.categories[0] : t.categories,
          account: Array.isArray(t.accounts) ? t.accounts[0] : t.accounts,
        }));
        setTransactions(formatted);
      }

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      if (accountsRes.data) {
        setAccounts(accountsRes.data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = async (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      category_id: transaction.category_id || '',
      notes: transaction.notes || '',
      applyToAll: false
    });

    // Count similar transactions with the same merchant_key
    if (user) {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('merchant_key', transaction.merchant_key)
        .neq('id', transaction.id);

      setSimilarTransactionsCount(count || 0);
    }

    setEditDialogOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!editingTransaction || !user) return;

    try {
      if (editForm.applyToAll && similarTransactionsCount > 0) {
        // Bulk update all transactions with the same merchant_key
        const { error } = await supabase
          .from('transactions')
          .update({
            category_id: editForm.category_id || null,
            classification_source: 'manual',
            classification_confidence: 1.0,
          })
          .eq('user_id', user.id)
          .eq('merchant_key', editingTransaction.merchant_key);

        if (error) throw error;

        toast.success(`Updated ${similarTransactionsCount + 1} transactions successfully`);
      } else {
        // Single transaction update
        const { error } = await supabase
          .from('transactions')
          .update({
            category_id: editForm.category_id || null,
            notes: editForm.notes || null,
            classification_source: 'manual',
            classification_confidence: 1.0,
          })
          .eq('id', editingTransaction.id);

        if (error) throw error;

        toast.success('Transaction updated successfully');
      }

      setEditDialogOpen(false);
      setEditingTransaction(null);
      loadData();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.merchant_key.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || t.category_id === selectedCategory;

    const matchesAccount =
      selectedAccount === 'all' || t.account_id === selectedAccount;

    return matchesSearch && matchesCategory && matchesAccount;
  });

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
            <p className="text-slate-400">Loading your transactions...</p>
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 bg-white/[0.05] rounded-2xl animate-pulse" />
          <Skeleton className="h-96 bg-white/[0.05] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl">
                <Receipt className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">Transactions</h1>
          </div>
          <p className="text-slate-400">View and manage your financial transactions</p>
        </div>
        <Button
          className="bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1] backdrop-blur-xl transition-all duration-300 hover:scale-105 rounded-xl"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent" />
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500 focus:bg-white/[0.1] transition-colors"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/[0.1]">
                <SelectItem value="all" className="text-white hover:bg-white/[0.1]">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-white/[0.1]">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/[0.1]">
                <SelectItem value="all" className="text-white hover:bg-white/[0.1]">All Accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="text-white hover:bg-white/[0.1]">
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table Card */}
      <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent" />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.05] hover:bg-transparent">
                  <TableHead className="text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-400">Description</TableHead>
                  <TableHead className="text-slate-400">Category</TableHead>
                  <TableHead className="text-right text-slate-400">Amount</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow className="border-white/[0.05] hover:bg-white/[0.02]">
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-white/[0.05] rounded-2xl">
                          <Receipt className="h-8 w-8 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">No transactions found</p>
                          <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or import new data</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                      <TableCell className="font-medium text-white">
                        {format(new Date(transaction.posted_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{transaction.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-400">{transaction.merchant_key}</span>
                            {transaction.account && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs text-slate-500">
                                  {transaction.account.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-white/[0.2] text-white hover:bg-white/[0.05] transition-colors"
                          style={{ borderColor: transaction.category?.color }}
                        >
                          {transaction.category?.name || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${transaction.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Dialog open={editDialogOpen && editingTransaction?.id === transaction.id} onOpenChange={(open) => {
                          if (!open) {
                            setEditDialogOpen(false);
                            setEditingTransaction(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                              className="text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-white/[0.1] text-white max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
                                  <Edit2 className="h-4 w-4 text-white" />
                                </div>
                                Edit Transaction
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 pt-4">
                              {/* Transaction Details */}
                              <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                                <p className="text-sm text-slate-400 mb-1">Description</p>
                                <p className="font-semibold text-white">{editingTransaction?.description}</p>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
                                  <span className="text-sm text-slate-400">Amount</span>
                                  <span className={`font-bold ${(editingTransaction?.amount || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                    {formatCurrency(editingTransaction?.amount || 0)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-sm text-slate-400">Date</span>
                                  <span className="text-white">
                                    {editingTransaction && format(new Date(editingTransaction.posted_date), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                              </div>

                              {/* Category Selection with Search */}
                              <div className="space-y-2">
                                <Label htmlFor="category" className="text-slate-300">Category</Label>
                                <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={categorySearchOpen}
                                      className="w-full justify-between bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.1] hover:text-white"
                                    >
                                      {editForm.category_id ? (
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-3 h-3 rounded-full"
                                            style={{
                                              backgroundColor: categories.find((c) => c.id === editForm.category_id)?.color,
                                            }}
                                          />
                                          <span>{categories.find((c) => c.id === editForm.category_id)?.name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-500">Search categories...</span>
                                      )}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[400px] p-0 bg-slate-900 border-white/[0.1]" align="start">
                                    <Command className="bg-slate-900 [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-white/[0.1] [&_[cmdk-input-wrapper]]:bg-transparent">
                                      <CommandInput
                                        placeholder="Search categories..."
                                        className="h-12 bg-transparent border-0 text-white placeholder:text-slate-500 focus:ring-0 [&_svg]:text-slate-500"
                                      />
                                      <CommandList className="max-h-[350px]">
                                        <CommandEmpty className="py-6 text-center text-slate-400">
                                          No category found.
                                        </CommandEmpty>
                                        <CommandGroup className="overflow-y-auto max-h-[350px]">
                                          {categories.map((category) => (
                                            <CommandItem
                                              key={category.id}
                                              value={`${category.name}-${category.id}`}
                                              onSelect={() => {
                                                setEditForm({ ...editForm, category_id: category.id });
                                                setCategorySearchOpen(false);
                                              }}
                                              className="text-white hover:bg-white/[0.1] cursor-pointer"
                                            >
                                              <Check
                                                className={cn(
                                                  'mr-2 h-4 w-4',
                                                  editForm.category_id === category.id ? 'opacity-100' : 'opacity-0'
                                                )}
                                              />
                                              <div
                                                className="w-3 h-3 rounded-full mr-2"
                                                style={{ backgroundColor: category.color }}
                                              />
                                              <span className="flex-1">{category.name}</span>
                                              <span className="text-xs text-slate-500 capitalize">{category.type}</span>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              {/* Notes */}
                              <div className="space-y-2">
                                <Label htmlFor="notes" className="text-slate-300">Notes</Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Add notes about this transaction..."
                                  value={editForm.notes}
                                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500 min-h-[100px] resize-none"
                                />
                              </div>

                              {/* Bulk Update Option */}
                              {similarTransactionsCount > 0 && (
                                <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl space-y-3">
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      id="applyToAll"
                                      checked={editForm.applyToAll}
                                      onCheckedChange={(checked) =>
                                        setEditForm({ ...editForm, applyToAll: checked as boolean })
                                      }
                                      className="mt-1 border-violet-500/50 data-[state=checked]:bg-violet-600"
                                    />
                                    <div className="flex-1">
                                      <Label
                                        htmlFor="applyToAll"
                                        className="text-slate-200 font-medium cursor-pointer flex items-center gap-2"
                                      >
                                        <Users className="h-4 w-4 text-violet-400" />
                                        Update all similar transactions
                                      </Label>
                                      <p className="text-sm text-slate-400 mt-1">
                                        Apply this category to all <span className="text-violet-400 font-semibold">{similarTransactionsCount + 1}</span> transactions from{' '}
                                        <span className="text-white font-medium">{editingTransaction?.merchant_key}</span>
                                      </p>
                                      {editForm.applyToAll && (
                                        <p className="text-xs text-violet-300 mt-2 flex items-center gap-1">
                                          <Sparkles className="h-3 w-3" />
                                          Notes will only be added to this transaction
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-3 pt-2">
                                <Button
                                  onClick={() => {
                                    setEditDialogOpen(false);
                                    setEditingTransaction(null);
                                  }}
                                  variant="outline"
                                  className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-white"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleSaveTransaction}
                                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg"
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-400">
          Showing <span className="text-white font-semibold">{filteredTransactions.length}</span> of{' '}
          <span className="text-white font-semibold">{transactions.length}</span> transactions
        </p>
        {filteredTransactions.length !== transactions.length && (
          <Button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedAccount('all');
            }}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-white/[0.05]"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
