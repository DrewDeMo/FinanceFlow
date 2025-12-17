'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
import {
    Loader2,
    Plus,
    Pencil,
    Trash2,
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    ChevronDown,
    ChevronRight,
    MoveRight,
    Eye,
    EyeOff,
    Search,
    Tag,
    Circle,
    Sparkles,
} from 'lucide-react';
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

    // Stats
    const totalCategories = categories.length;
    const categoriesWithTransactions = categories.filter(c => c.transaction_count > 0).length;

    // Get selected transactions for a specific category
    function getSelectedForCategory(categoryId: string): string[] {
        const transactions = categoryTransactions.get(categoryId) || [];
        return transactions.filter(t => selectedTransactions.has(t.id)).map(t => t.id);
    }

    // Select all transactions in a category
    function selectAllInCategory(categoryId: string) {
        const transactions = categoryTransactions.get(categoryId) || [];
        setSelectedTransactions(prev => {
            const next = new Set(prev);
            transactions.forEach(t => next.add(t.id));
            return next;
        });
    }

    // Deselect all transactions in a category
    function deselectAllInCategory(categoryId: string) {
        const transactions = categoryTransactions.get(categoryId) || [];
        setSelectedTransactions(prev => {
            const next = new Set(prev);
            transactions.forEach(t => next.delete(t.id));
            return next;
        });
    }

    function CategoryCard({ category }: { category: Category }) {
        const IconComponent = (LucideIcons as any)[category.icon] || LucideIcons.Circle;
        const isExpanded = expandedCategories.has(category.id);
        const transactions = categoryTransactions.get(category.id) || [];
        const isLoadingTrans = loadingTransactions.has(category.id);
        const hasTransactions = category.transaction_count > 0;
        const selectedInCategory = getSelectedForCategory(category.id);
        const allSelected = transactions.length > 0 && selectedInCategory.length === transactions.length;

        return (
            <Card className="group transition-all hover:shadow-card hover:border-border">
                <CardContent className="p-0">
                    {/* Main row - clickable to expand */}
                    <div
                        className={cn(
                            "flex items-center gap-3 p-4",
                            hasTransactions && "cursor-pointer"
                        )}
                        onClick={() => hasTransactions && toggleCategoryExpanded(category.id)}
                    >
                        {/* Category icon with color */}
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${category.color}15` }}
                        >
                            <IconComponent
                                className="h-5 w-5"
                                style={{ color: category.color }}
                            />
                        </div>

                        {/* Category info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-foreground truncate">
                                    {category.name}
                                </h3>
                                <Badge
                                    variant="outline"
                                    className="text-xs capitalize font-normal hidden sm:inline-flex"
                                    style={{
                                        borderColor: `${category.color}40`,
                                        color: category.color,
                                    }}
                                >
                                    {category.type}
                                </Badge>
                                {category.has_customization && (
                                    <Badge variant="secondary" className="text-xs gap-1 hidden sm:inline-flex">
                                        <Sparkles className="h-3 w-3" />
                                        Customized
                                    </Badge>
                                )}
                                {category.is_system && (
                                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                                        System
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                                <span>{category.transaction_count.toLocaleString()} transactions</span>
                                <span className="text-border">•</span>
                                <span className="font-medium tabular-nums">
                                    ${Math.abs(category.total_amount).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Action buttons - always visible but subtle */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(category)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            {!category.is_system && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openDeleteDialog(category)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            {hasTransactions && (
                                <div className="ml-1">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expanded Transaction List */}
                    {isExpanded && (
                        <div className="border-t border-border bg-muted/30">
                            {isLoadingTrans ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                            ) : transactions.length > 0 ? (
                                <>
                                    {/* Selection toolbar - appears inside the expanded section */}
                                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        selectAllInCategory(category.id);
                                                    } else {
                                                        deselectAllInCategory(category.id);
                                                    }
                                                }}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {selectedInCategory.length > 0
                                                    ? `${selectedInCategory.length} selected`
                                                    : 'Select all'}
                                            </span>
                                        </div>
                                        {selectedInCategory.length > 0 && (
                                            <Button
                                                size="sm"
                                                onClick={openMoveDialog}
                                                className="gap-2"
                                            >
                                                <MoveRight className="h-4 w-4" />
                                                Move to Category
                                            </Button>
                                        )}
                                    </div>
                                    <div className="divide-y divide-border max-h-80 overflow-y-auto">
                                        {transactions.map((transaction) => (
                                            <label
                                                key={transaction.id}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Checkbox
                                                    checked={selectedTransactions.has(transaction.id)}
                                                    onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {transaction.description}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(transaction.posted_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-semibold text-foreground tabular-nums">
                                                    ${Math.abs(transaction.amount).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </p>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
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
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                        Categories
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your transaction categories and organize your finances
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedTransactions.size > 0 && (
                        <Button
                            onClick={openMoveDialog}
                            variant="outline"
                            className="gap-2"
                        >
                            <MoveRight className="h-4 w-4" />
                            Move {selectedTransactions.size} Selected
                        </Button>
                    )}
                    <Button onClick={() => setNewDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Category
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-foreground">
                                {groupedCategories.income.length}
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
                            <p className="text-2xl font-semibold text-foreground">
                                {groupedCategories.expense.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Expense</p>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                            <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-foreground">
                                {groupedCategories.transfer.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Transfer</p>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                            <Tag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-foreground">
                                {categoriesWithTransactions}
                            </p>
                            <p className="text-sm text-muted-foreground">In Use</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10"
                            />
                        </div>

                        {/* Type filter */}
                        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                            <SelectTrigger className="w-full sm:w-[160px] h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="income">
                                    <span className="flex items-center gap-2">
                                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                        Income
                                    </span>
                                </SelectItem>
                                <SelectItem value="expense">
                                    <span className="flex items-center gap-2">
                                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                                        Expense
                                    </span>
                                </SelectItem>
                                <SelectItem value="transfer">
                                    <span className="flex items-center gap-2">
                                        <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
                                        Transfer
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Hide empty toggle */}
                        <Button
                            variant={hideEmpty ? "secondary" : "outline"}
                            onClick={() => setHideEmpty(!hideEmpty)}
                            className="gap-2"
                        >
                            {hideEmpty ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            {hideEmpty ? 'Show Empty' : 'Hide Empty'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Categories Lists */}
            <div className="space-y-8">
                {/* Income Categories */}
                {(filterType === 'all' || filterType === 'income') && groupedCategories.income.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-medium text-foreground">Income Categories</h2>
                            <Badge variant="secondary" className="ml-2">{groupedCategories.income.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {groupedCategories.income.map((category) => (
                                <CategoryCard key={category.id} category={category} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Expense Categories */}
                {(filterType === 'all' || filterType === 'expense') && groupedCategories.expense.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
                                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-lg font-medium text-foreground">Expense Categories</h2>
                            <Badge variant="secondary" className="ml-2">{groupedCategories.expense.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {groupedCategories.expense.map((category) => (
                                <CategoryCard key={category.id} category={category} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Transfer Categories */}
                {(filterType === 'all' || filterType === 'transfer') && groupedCategories.transfer.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                                <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-lg font-medium text-foreground">Transfer Categories</h2>
                            <Badge variant="secondary" className="ml-2">{groupedCategories.transfer.length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {groupedCategories.transfer.map((category) => (
                                <CategoryCard key={category.id} category={category} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {filteredCategories.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 px-6">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <Tag className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">
                                No categories found
                            </h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                                {hideEmpty
                                    ? 'No categories with transactions found. Click "Show Empty" to see all categories.'
                                    : 'No categories match your current filters.'}
                            </p>
                            {hideEmpty && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setHideEmpty(false)}
                                >
                                    Show Empty Categories
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Move Transactions Dialog */}
            <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Move Transactions</DialogTitle>
                        <DialogDescription>
                            Move {selectedTransactions.size} selected transaction(s) to a different category
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="target-category">Target Category</Label>
                            <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => {
                                        const CatIcon = (LucideIcons as any)[cat.icon] || Circle;
                                        return (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <span className="flex items-center gap-2">
                                                    <CatIcon className="h-4 w-4" style={{ color: cat.color }} />
                                                    {cat.name}
                                                    <span className="text-muted-foreground capitalize">({cat.type})</span>
                                                </span>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription>
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
                                    className="h-10"
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

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSubmit}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Category Dialog */}
            <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Category</DialogTitle>
                        <DialogDescription>
                            Add a custom category for your transactions
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-name">Name</Label>
                            <Input
                                id="new-name"
                                placeholder="e.g., Coffee Shops"
                                value={newForm.name}
                                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-type">Type</Label>
                            <Select
                                value={newForm.type}
                                onValueChange={(value: any) => setNewForm({ ...newForm, type: value })}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">
                                        <span className="flex items-center gap-2">
                                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                            Income
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="expense">
                                        <span className="flex items-center gap-2">
                                            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                                            Expense
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="transfer">
                                        <span className="flex items-center gap-2">
                                            <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
                                            Transfer
                                        </span>
                                    </SelectItem>
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

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCategory}>
                            Create Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>?
                            This action cannot be undone. You can only delete categories that have no transactions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCategory}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
