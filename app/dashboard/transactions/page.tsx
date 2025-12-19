'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import {
  Search,
  Download,
  Filter,
  Edit2,
  Receipt,
  Sparkles,
  Users,
  Check,
  ChevronsUpDown,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  Tag,
  X,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Circle,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { toast } from 'sonner';

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

const ITEMS_PER_PAGE = 25;

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    category_id: '',
    notes: '',
    applyToAll: false
  });
  const [similarTransactionsCount, setSimilarTransactionsCount] = useState(0);
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Fetch categories with customizations from API
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

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
            accounts:account_id (name, type)
          `)
          .eq('user_id', user.id)
          .order('posted_date', { ascending: false })
          .limit(500),
        // Fetch categories from API to get proper customizations
        token ? fetch('/api/categories', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then(res => res.json()) : null,
        supabase
          .from('accounts')
          .select('id, name, type')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('name'),
      ]);

      // Store categories with customizations
      const customizedCategories = categoriesRes?.categories || [];
      setCategories(customizedCategories);

      // Create a map of categories for quick lookup
      const categoryMap = new Map(
        customizedCategories.map((cat: Category) => [cat.id, cat])
      );

      // Map transactions with customized category data
      if (transactionsRes.data) {
        const formatted = transactionsRes.data.map((t: any) => {
          const category = t.category_id ? categoryMap.get(t.category_id) : null;
          return {
            ...t,
            category: category ? {
              name: category.name,
              color: category.color,
              icon: category.icon
            } : null,
            account: Array.isArray(t.accounts) ? t.accounts[0] : t.accounts,
          };
        });
        setTransactions(formatted);
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
    }).format(Math.abs(amount));
  };

  const formatCompactCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant_key.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || t.category_id === selectedCategory;

      const matchesAccount =
        selectedAccount === 'all' || t.account_id === selectedAccount;

      const matchesType =
        selectedType === 'all' ||
        (selectedType === 'income' && t.amount > 0) ||
        (selectedType === 'expense' && t.amount < 0);

      return matchesSearch && matchesCategory && matchesAccount && matchesType;
    });
  }, [transactions, searchTerm, selectedCategory, selectedAccount, selectedType]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedAccount, selectedType]);

  // Summary stats for filtered transactions
  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const uncategorized = filteredTransactions.filter(t => !t.category_id).length;

    return { income, expenses, count: filteredTransactions.length, uncategorized };
  }, [filteredTransactions]);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'all' || selectedAccount !== 'all' || selectedType !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSelectedType('all');
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-2xl mb-6" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Transactions
            </h1>
            <p className="text-muted-foreground mt-1">
              {transactions.length > 0
                ? `${transactions.length} total transactions`
                : 'No transactions yet'}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCompactCurrency(stats.income)}
                </p>
                <p className="text-sm text-muted-foreground">Income</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {formatCompactCurrency(stats.expenses)}
                </p>
                <p className="text-sm text-muted-foreground">Expenses</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.count}
                </p>
                <p className="text-sm text-muted-foreground">Transactions</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                <Tag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stats.uncategorized}
                </p>
                <p className="text-sm text-muted-foreground">Uncategorized</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter dropdowns */}
              <div className="flex flex-wrap gap-2">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[130px] h-10">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">
                      <span className="flex items-center gap-2">
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        Income
                      </span>
                    </SelectItem>
                    <SelectItem value="expense">
                      <span className="flex items-center gap-2">
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                        Expense
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[160px] h-10">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => {
                      const IconComponent = (LucideIcons as any)[cat.icon] || Circle;
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <IconComponent
                              className="h-3.5 w-3.5"
                              style={{ color: cat.color }}
                            />
                            {cat.name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-[160px] h-10">
                    <SelectValue placeholder="Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-10 px-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {hasActiveFilters ? 'No matching transactions' : 'No transactions yet'}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more results.'
                    : 'Import your bank statements to start tracking your finances.'}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {paginatedTransactions.map((transaction, index) => {
                  const isIncome = transaction.amount > 0;
                  const showDateHeader = index === 0 ||
                    paginatedTransactions[index - 1].posted_date !== transaction.posted_date;

                  return (
                    <div key={transaction.id}>
                      {showDateHeader && (
                        <div className="px-4 py-2 bg-muted/50 border-b border-border">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {getDateLabel(transaction.posted_date)}
                          </div>
                        </div>
                      )}
                      <div
                        className="group flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        {/* Category icon indicator */}
                        {(() => {
                          const CategoryIcon = transaction.category
                            ? (LucideIcons as any)[transaction.category.icon] || Circle
                            : Circle;
                          const iconColor = transaction.category?.color || '#9CA3AF';
                          const bgColor = transaction.category?.color
                            ? `${transaction.category.color}15`
                            : (isIncome ? 'rgb(236, 253, 245)' : 'rgb(254, 242, 242)');

                          return (
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                              style={{ backgroundColor: bgColor }}
                            >
                              {transaction.category ? (
                                <CategoryIcon
                                  className="h-5 w-5"
                                  style={{ color: iconColor }}
                                />
                              ) : (
                                isIncome ? (
                                  <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                                )
                              )}
                            </div>
                          );
                        })()}

                        {/* Transaction details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              {transaction.description}
                            </span>
                            {transaction.classification_source === 'ai' && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Sparkles className="h-3 w-3 text-violet-500" />
                                </TooltipTrigger>
                                <TooltipContent>Auto-categorized</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {transaction.merchant_key}
                            </span>
                            {transaction.account && (
                              <>
                                <span className="text-border">•</span>
                                <span>{transaction.account.name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Category badge */}
                        <div className="hidden sm:flex items-center">
                          {transaction.category ? (() => {
                            const IconComponent = (LucideIcons as any)[transaction.category.icon] || Circle;
                            return (
                              <Badge
                                variant="outline"
                                className="font-normal transition-colors group-hover:bg-muted gap-1.5"
                                style={{
                                  borderColor: transaction.category.color,
                                  color: transaction.category.color,
                                }}
                              >
                                <IconComponent className="h-3 w-3" />
                                {transaction.category.name}
                              </Badge>
                            );
                          })() : (
                            <Badge variant="outline" className="font-normal text-muted-foreground border-dashed">
                              Uncategorized
                            </Badge>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <span className={cn(
                            "font-semibold tabular-nums",
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          )}>
                            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </div>

                        {/* Edit indicator */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false);
            setEditingTransaction(null);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Edit2 className="h-4 w-4 text-primary" />
                </div>
                Edit Transaction
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {/* Transaction Summary */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="font-medium text-foreground">{editingTransaction?.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className={cn(
                    "font-semibold",
                    (editingTransaction?.amount || 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  )}>
                    {formatCurrency(editingTransaction?.amount || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-foreground">
                    {editingTransaction && format(new Date(editingTransaction.posted_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-10"
                    >
                      {editForm.category_id ? (() => {
                        const selectedCat = categories.find((c) => c.id === editForm.category_id);
                        const SelectedIcon = selectedCat ? (LucideIcons as any)[selectedCat.icon] || Circle : Circle;
                        return (
                          <span className="flex items-center gap-2">
                            <SelectedIcon
                              className="h-4 w-4"
                              style={{ color: selectedCat?.color }}
                            />
                            {selectedCat?.name}
                          </span>
                        );
                      })() : (
                        <span className="text-muted-foreground">Select category...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search categories..." className="h-10" />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {categories.map((category) => {
                            const IconComponent = (LucideIcons as any)[category.icon] || Circle;
                            return (
                              <CommandItem
                                key={category.id}
                                value={`${category.name}-${category.id}`}
                                onSelect={() => {
                                  setEditForm({ ...editForm, category_id: category.id });
                                  setCategorySearchOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    editForm.category_id === category.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <IconComponent
                                  className="h-4 w-4 mr-2"
                                  style={{ color: category.color }}
                                />
                                <span className="flex-1">{category.name}</span>
                                <span className="text-xs text-muted-foreground capitalize">{category.type}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea
                  placeholder="Add a note..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Bulk Update Option */}
              {similarTransactionsCount > 0 && (
                <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="applyToAll"
                      checked={editForm.applyToAll}
                      onCheckedChange={(checked) =>
                        setEditForm({ ...editForm, applyToAll: checked as boolean })
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="applyToAll"
                        className="text-sm font-medium cursor-pointer flex items-center gap-2"
                      >
                        <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        Apply to all similar transactions
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Update all {similarTransactionsCount + 1} transactions from {editingTransaction?.merchant_key}
                      </p>
                      {editForm.applyToAll && (
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Notes will only be added to this transaction
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingTransaction(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveTransaction} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
