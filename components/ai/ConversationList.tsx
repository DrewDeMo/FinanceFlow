'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MessageSquare, MoreVertical, Trash2, Plus, Trash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Conversation {
    id: string;
    title: string;
    message_count: number;
    created_at: string;
    updated_at: string;
}

interface ConversationListProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
    isLoading?: boolean;
}

export function ConversationList({
    conversations,
    selectedId,
    onSelect,
    onNew,
    onDelete,
    onClearAll,
    isLoading = false,
}: ConversationListProps) {
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

    const handleDelete = (id: string) => {
        onDelete(id);
        setDeleteConfirmId(null);
    };

    const handleClearAll = () => {
        onClearAll();
        setShowClearAllConfirm(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b space-y-2">
                <Button onClick={onNew} className="w-full gap-2" size="sm">
                    <Plus className="h-4 w-4" />
                    New Conversation
                </Button>
                {conversations.length > 0 && (
                    <Button
                        variant="outline"
                        onClick={() => setShowClearAllConfirm(true)}
                        className="w-full gap-2 text-destructive hover:text-destructive"
                        size="sm"
                    >
                        <Trash className="h-4 w-4" />
                        Clear All Chats
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading conversations...
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No conversations yet. Start a new one!
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={cn(
                                    'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                                    selectedId === conv.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted'
                                )}
                                onClick={() => onSelect(conv.id)}
                            >
                                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{conv.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                                    </p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmId(conv.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this conversation? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Conversations</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleClearAll}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Clear All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
