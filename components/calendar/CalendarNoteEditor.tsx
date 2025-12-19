'use client';

import * as React from 'react';
import { Trash2, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CalendarNoteEditorProps {
    initialContent: string;
    onSave: (content: string) => Promise<void>;
    onCancel: () => void;
    onDelete?: () => Promise<void>;
    isSaving: boolean;
}

export function CalendarNoteEditor({
    initialContent,
    onSave,
    onCancel,
    onDelete,
    isSaving,
}: CalendarNoteEditorProps) {
    const [content, setContent] = React.useState(initialContent);
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        // Focus the textarea when the editor opens
        if (textareaRef.current) {
            textareaRef.current.focus();
            // Move cursor to end
            textareaRef.current.setSelectionRange(content.length, content.length);
        }
    }, []);

    const handleSave = async () => {
        await onSave(content);
    };

    const handleDelete = async () => {
        if (onDelete) {
            await onDelete();
        }
        setShowDeleteDialog(false);
    };

    const hasChanges = content !== initialContent;
    const isEmpty = content.trim() === '';

    return (
        <div className="space-y-3">
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add a note for this day... (e.g., 'High spending - anniversary dinner' or 'Rent payment due')"
                className="min-h-[100px] resize-none text-sm"
                disabled={isSaving}
            />

            <div className="flex items-center justify-between">
                <div>
                    {onDelete && initialContent && (
                        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    disabled={isSaving}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. The note will be permanently deleted.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || (!hasChanges && !isEmpty)}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
