'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { IconPicker } from '@/components/ui/icon-picker';
import { ColorPicker } from '@/components/ui/color-picker';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';
import { Loader2, Plus, Pencil, Trash2, TrendingUp, TrendingDown, ArrowRightLeft, ChevronDown, ChevronRight, MoveRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
    id: string;
    user_id: string | null;
    name: string;
    type: 'income' | 'expense' | 'transfer';
    icon: string;
    color: string;
    is_system: boolean;
    created_at: string;
    transaction_count: number;
    total_amount: number;
    has_customization: boolean;
    customization_id: string | null;
}

interface Transaction {
    id: string;
    posted_date: string;
    description: string;
    amount: number;
    merchant_key: string;
    category_id: string | null;
}

export default function CategoriesPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [hideEmpty, setHideEmpty] = useState(true);

    // Expanded categories state
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [categoryTransactions, setCategoryTransactions] = useState<Map<string, Transaction[]>>(new Map());
    const [loadingTransactions, setLoadingTransactions] = useState<Set<string>>(new Set());

    // Transaction selection state
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [targetCategoryId, setTargetCategoryId] = useState('');
    const [movingTransactions, setMovingTransactions] = useState(false);

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        icon: '',
        color: '',
    });

    // New category dialog state
    const [newDialogOpen, setNewDialogOpen] = useState(false);
    const [newForm, setNewForm] = useState({
        name: '',
        type: 'expense' as 'income' | 'expense' | 'transfer',
        icon: 'Circle',
        color: '#6B7280',
    });

    // Delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    useEffect(() => {
        if (user) {
            loadCategories();
        }
    }, [user]);

    async function loadCategories() {
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('No access token');
            }

            const response = await fetch('/api/categories', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }

            const data = await response.json();
            setCategories(data.categories || []);
        } catch (error) {
            console.error('Error loading categories:', error);
            toast({
                title: 'Error',
                description: 'Failed to load categories',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }

    async function loadTransactionsForCategory(categoryId: string) {
        if (categoryTransactions.has(categoryId)) {
            return; // Already loaded
        }

        setLoadingTransactions(prev => new Set(prev).add(categoryId));

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('No access token');
            }

            const response = await fetch(`/api/transactions?category_id=${categoryId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }

            const data = await response.json();
            setCategoryTransactions(prev => new Map(prev).set(categoryId, data.transactions || []));
        } catch (error) {
            console.error('Error loading transactions:', error);
            toast({
                title: 'Error',
                description: 'Failed to load transactions',
                variant: 'destructive',
            });
        } finally {
            setLoadingTransactions(prev => {
                const next = new Set(prev);
                next.delete(categoryId);
                return next;
            });
        }
    }

    function toggleCategoryExpanded(categoryId: string) {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
                loadTransactionsForCategory(categoryId);
            }
            return next;
        });
    }

    function toggleTransactionSelection(transactionId: string) {
        setSelectedTransactions(prev => {
            const next = new Set(prev);
            if (next.has(transactionId)) {
                next.delete(transactionId);
            } else {
                next.add(transactionId);
            }
            return next;
        });
    }

    function openMoveDialog() {
        if (selectedTransactions.size === 0) {
            toast({
                title: 'No transactions selected',
                description: 'Please select transactions to move',
                variant: 'destructive',
            });
            return;
        }
        setMoveDialogOpen(true);
    }

    async function handleMoveTransactions() {
        if (!targetCategoryId || selectedTransactions.size === 0) {
            return;
        }

        setMovingTransactions(true);

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('No access token');
            }

            const response = await fetch('/api/transactions', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    transactionIds: Array.from(selectedTransactions),
                    newCategoryId: targetCategoryId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to move transactions');
            }

            toast({
                title: 'Success',
                description: `Moved ${selectedTransactions.size} transaction(s)`,
            });

            // Clear selections and refresh
            setSelectedTransactions(new Set());
            setMoveDialogOpen(false);
            setTargetCategoryId('');
            setCategoryTransactions(new Map()); // Clear cache
            setExpandedCategories(new Set()); // Collapse all
            loadCategories();
        } catch (error) {
            console.error('Error moving transactions:', error);
            toast({
                title: 'Error',
                description: 'Failed to move transactions',
                variant: 'destructive',
            });
        } finally {
            setMovingTransactions(false);
        }
    }

    function openEditDialog(category: Category) {
        setEditingCategory(category);
        setEditForm({
            name: category.name,
            icon: category.icon,
            color: category.color,
        });
        setEditDialogOpen(true);
    }

    async function handleEditSubmit() {
        if (!editingCategory) return;

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('No access token');
            }

            const response = await fetch(`/api/categories/${editingCategory.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(editForm),
            });

            if (!response.ok) {
                throw new Error('Failed to update category');
            }

            toast({
                title: 'Success',
                description: `${editingCategory.name} updated successfully`,
            });

            setEditDialogOpen(false);
            loadCategories();
        } catch (error) {
            console.error('Error updating category:', error);
            toast({
                title: 'Error',
                description: 'Failed to update category',
                variant: 'destructive',
            });
        }
    }

    async function handleCreateCategory() {
        if (!newForm.name.trim()) {
            toast({
                title: 'Error',
                description: 'Category name is required',
                variant: 'destructive',
            });
            return;
        }

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('No access token');
            }

            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newForm),
            });

            if (!response.ok) {
                throw new Error('Failed to create category');
            }

            toast({
                title: 'Success',
                description: `${newForm.name} created successfully`,
            });

            setNewDialogOpen(false);
            setNewForm({
                name: '',
                type: 'expense',
                icon: 'circle',
                color: '#6B7280',
            });
            loadCategories();
        } catch (error) {
            console.error('Error creating category:', error);
            toast({
                title: 'Error',
                description: 'Failed to create category',
                variant: 'destructive',
            });
        }
    }

    function openDeleteDialog(category: Category) {
        setCategoryToDelete(category);
        setDeleteDialogOpen(true);
    }

    async function handleDeleteCategory() {
        if (!categoryToDelete) return;

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error('No access token');
            }

            const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete category');
            }

            toast({
                title: 'Success',
                description: `${categoryToDelete.name} deleted successfully`,
            });

            setDeleteDialogOpen(false);
            setCategoryToDelete(null);
            loadCategories();
        } catch (error: any) {
            console.error('Error deleting category:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete category',
                variant: 'destructive',
            });
        }
    }

    const filteredCategories = categories.filter((category) => {
        const matchesType = filterType === 'all' || category.type === filterType;
        const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesEmpty = !hideEmpty || category.transaction_count > 0;
        return matchesType && matchesSearch && matchesEmpty;
    });

    const groupedCategories = {
        income: filteredCategories.filter((c) => c.type === 'income'),
        expense: filteredCategories.filter((c) => c.type === 'expense'),
        transfer: filteredCategories.filter((c) => c.type === 'transfer'),
    };

    function CategoryCard({ category }: { category: Category }) {
        const IconComponent = (LucideIcons as any)[category.icon] || LucideIcons.Circle;
        const isExpanded = expandedCategories.has(category.id);
        const transactions = categoryTransactions.get(category.id) || [];
        const isLoadingTrans = loadingTransactions.has(category.id);

        return (
            <Card className="relative overflow-hidden border-0 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.05] transition-all">
                {/* Gradient accent */}
                <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: category.color }}
                />

                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleCategoryExpanded(category.id)}
                                className="h-8 w-8 p-0 hover:bg-white/[0.1]"
                                disabled={category.transaction_count === 0}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                )}
                            </Button>
                            <div
                                className="p-2.5 rounded-xl"
                                style={{ backgroundColor: `${category.color}20` }}
                            >
                                <IconComponent
                                    className="h-5 w-5"
                                    style={{ color: category.color }}
                                />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    {category.name}
                                    {category.has_customization && (
                                        <Badge variant="outline" className="text-xs border-violet-500/50 text-violet-400">
                                            Customized
                                        </Badge>
                                    )}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                        variant="outline"
                                        className="text-xs capitalize"
                                        style={{
                                            borderColor: `${category.color}40`,
                                            color: category.color,
                                        }}
                                    >
                                        {category.type}
                                    </Badge>
                                    {category.is_system && (
                                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                            System
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(category)}
                                className="h-8 w-8 p-0 hover:bg-white/[0.1]"
                            >
                                <Pencil className="h-4 w-4 text-slate-400" />
                            </Button>
                            {!category.is_system && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openDeleteDialog(category)}
                                    className="h-8 w-8 p-0 hover:bg-red-500/[0.1] hover:text-red-400"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white/[0.02] rounded-lg p-2.5">
                            <p className="text-xs text-slate-500 mb-1">Transactions</p>
                            <p className="text-lg font-semibold text-white">
                                {category.transaction_count.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white/[0.02] rounded-lg p-2.5">
                            <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                            <p className="text-lg font-semibold text-white">
                                ${Math.abs(category.total_amount).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Expanded Transaction List */}
                    {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/[0.05]">
                            {isLoadingTrans ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                                </div>
                            ) : transactions.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {transactions.map((transaction) => (
                                        <div
                                            key={transaction.id}
                                            className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                                        >
                                            <Checkbox
                                                checked={selectedTransactions.has(transaction.id)}
                                                onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                                                className="border-white/[0.2]"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">
                                                    {transaction.description}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(transaction.posted_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <p className="text-sm font-semibold text-white">
                                                ${Math.abs(transaction.amount).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No transactions found
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Category Management</h1>
                    <p className="text-slate-400">
                        Manage your transaction categories and organize your transactions
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedTransactions.size > 0 && (
                        <Button
                            onClick={openMoveDialog}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                        >
                            <MoveRight className="h-4 w-4 mr-2" />
                            Move {selectedTransactions.size} Selected
                        </Button>
                    )}
                    <Button
                        onClick={() => setNewDialogOpen(true)}
                        className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Category
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-0 bg-white/[0.03] backdrop-blur-xl">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                            />
                        </div>
                        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-white/[0.05] border-white/[0.1] text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/[0.1]">
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="transfer">Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => setHideEmpty(!hideEmpty)}
                            className={cn(
                                "border-white/[0.1] transition-colors",
                                hideEmpty
                                    ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                                    : "text-slate-400 hover:bg-white/[0.05]"
                            )}
                        >
                            {hideEmpty ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                            {hideEmpty ? 'Show Empty' : 'Hide Empty'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Income Categories</p>
                                <p className="text-2xl font-bold text-white mt-1">{groupedCategories.income.length}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-red-500/10 to-rose-500/10 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Expense Categories</p>
                                <p className="text-2xl font-bold text-white mt-1">{groupedCategories.expense.length}</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Transfer Categories</p>
                                <p className="text-2xl font-bold text-white mt-1">{groupedCategories.transfer.length}</p>
                            </div>
                            <ArrowRightLeft className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Categories Grid */}
            {(filterType === 'all' || filterType === 'income') && groupedCategories.income.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Income Categories
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {groupedCategories.income.map((category) => (
                            <CategoryCard key={category.id} category={category} />
                        ))}
                    </div>
                </div>
            )}

            {(filterType === 'all' || filterType === 'expense') && groupedCategories.expense.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        Expense Categories
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {groupedCategories.expense.map((category) => (
                            <CategoryCard key={category.id} category={category} />
                        ))}
                    </div>
                </div>
            )}

            {(filterType === 'all' || filterType === 'transfer') && groupedCategories.transfer.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                        Transfer Categories
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {groupedCategories.transfer.map((category) => (
                            <CategoryCard key={category.id} category={category} />
                        ))}
                    </div>
                </div>
            )}

            {filteredCategories.length === 0 && (
                <Card className="border-0 bg-white/[0.03] backdrop-blur-xl">
                    <CardContent className="p-12 text-center">
                        <p className="text-slate-400">
                            {hideEmpty
                                ? 'No categories with transactions found. Click "Show Empty" to see all categories.'
                                : 'No categories found'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Move Transactions Dialog */}
            <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle>Move Transactions</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Move {selectedTransactions.size} selected transaction(s) to a different category
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="target-category">Target Category *</Label>
                            <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                                <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/[0.1]">
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name} ({cat.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setMoveDialogOpen(false);
                                setTargetCategoryId('');
                            }}
                            disabled={movingTransactions}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleMoveTransactions}
                            className="bg-violet-500 hover:bg-violet-600"
                            disabled={!targetCategoryId || movingTransactions}
                        >
                            {movingTransactions ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Moving...
                                </>
                            ) : (
                                <>
                                    <MoveRight className="h-4 w-4 mr-2" />
                                    Move Transactions
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {editingCategory?.is_system
                                ? 'Customize the icon and color for this system category'
                                : 'Update the category details'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {!editingCategory?.is_system && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="bg-white/[0.05] border-white/[0.1] text-white"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="edit-icon">Icon</Label>
                            <IconPicker
                                value={editForm.icon}
                                onValueChange={(icon) => setEditForm({ ...editForm, icon })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-color">Color</Label>
                            <ColorPicker
                                value={editForm.color}
                                onValueChange={(color) => setEditForm({ ...editForm, color })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSubmit} className="bg-violet-500 hover:bg-violet-600">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Category Dialog */}
            <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
                <DialogContent className="bg-slate-900 border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle>Create New Category</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Add a custom category for your transactions
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-name">Name *</Label>
                            <Input
                                id="new-name"
                                placeholder="e.g., Coffee Shops"
                                value={newForm.name}
                                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-type">Type *</Label>
                            <Select
                                value={newForm.type}
                                onValueChange={(value: any) => setNewForm({ ...newForm, type: value })}
                            >
                                <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/[0.1]">
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="transfer">Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-icon">Icon</Label>
                            <IconPicker
                                value={newForm.icon}
                                onValueChange={(icon) => setNewForm({ ...newForm, icon })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-color">Color</Label>
                            <ColorPicker
                                value={newForm.color}
                                onValueChange={(color) => setNewForm({ ...newForm, color })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCategory} className="bg-violet-500 hover:bg-violet-600">
                            Create Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-slate-900 border-white/[0.1] text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Are you sure you want to delete <strong className="text-white">{categoryToDelete?.name}</strong>?
                            This action cannot be undone. You can only delete categories that have no transactions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.1]">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCategory}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
