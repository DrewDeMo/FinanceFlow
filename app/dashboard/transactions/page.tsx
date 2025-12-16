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
import { Search, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');

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

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    try {
      await (supabase
        .from('transactions')
        .update as any)({
          category_id: categoryId,
          classification_source: 'manual',
          classification_confidence: 1.0,
        })
        .eq('id', transactionId);

      setEditingId(null);
      loadData();
    } catch (error) {
      console.error('Error updating category:', error);
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
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="All accounts" />
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No transactions found. Import a CSV to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {format(new Date(transaction.posted_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">{transaction.merchant_key}</span>
                            {transaction.account && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs text-slate-400">
                                  {transaction.account.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingId === transaction.id ? (
                          <Select
                            value={editCategory}
                            onValueChange={(value) => {
                              setEditCategory(value);
                              handleCategoryChange(transaction.id, value);
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => {
                              setEditingId(transaction.id);
                              setEditCategory(transaction.category_id || '');
                            }}
                            style={{ borderColor: transaction.category?.color }}
                          >
                            {transaction.category?.name || 'Uncategorized'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-slate-600">
        Showing {filteredTransactions.length} of {transactions.length} transactions
      </div>
    </div>
  );
}
