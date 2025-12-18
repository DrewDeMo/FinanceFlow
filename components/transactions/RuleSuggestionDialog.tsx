'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, X, Check, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RuleSuggestionDialogProps {
    open: boolean;
    onClose: () => void;
    merchantName: string;
    merchantKey: string;
    categoryName: string;
    categoryColor: string;
    similarCount: number;
    onCreateRule: (pattern: string) => Promise<void>;
    onSkip: () => void;
}

export function RuleSuggestionDialog({
    open,
    onClose,
    merchantName,
    merchantKey,
    categoryName,
    categoryColor,
    similarCount,
    onCreateRule,
    onSkip,
}: RuleSuggestionDialogProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [customPattern, setCustomPattern] = useState(merchantKey.toLowerCase());
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateRule = async () => {
        setIsCreating(true);
        try {
            await onCreateRule(customPattern);
            onClose();
        } catch (error) {
            console.error('Error creating rule:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSkip = () => {
        onSkip();
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        Create a Smart Rule?
                    </DialogTitle>
                    <DialogDescription>
                        Automatically categorize future transactions from this merchant
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Rule Preview */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-900/50">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${categoryColor}20` }}>
                                <Users className="h-5 w-5" style={{ color: categoryColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground mb-1">
                                    Found {similarCount} similar transaction{similarCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    from <span className="font-medium text-foreground">{merchantName}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Will be categorized as:</span>
                            <Badge
                                variant="outline"
                                style={{
                                    borderColor: categoryColor,
                                    color: categoryColor,
                                    backgroundColor: `${categoryColor}15`
                                }}
                            >
                                {categoryName}
                            </Badge>
                        </div>
                    </div>

                    {/* Pattern Editor */}
                    {isEditing ? (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Merchant Pattern
                                <span className="text-xs text-muted-foreground ml-2">(case-insensitive)</span>
                            </Label>
                            <Input
                                value={customPattern}
                                onChange={(e) => setCustomPattern(e.target.value)}
                                placeholder="e.g., amazon"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Tip: Use shorter patterns to match more variations (e.g., "amazon" matches all Amazon transactions)
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Matching pattern:</p>
                                <code className="text-sm font-mono text-foreground">{customPattern}</code>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="gap-1.5"
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                            </Button>
                        </div>
                    )}

                    {/* Benefits */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            What happens next:
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">
                                    All {similarCount} matching transaction{similarCount !== 1 ? 's' : ''} will be updated
                                </span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">
                                    Future transactions from this merchant are auto-categorized
                                </span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">
                                    You can edit or delete the rule anytime
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={handleSkip}
                            className="flex-1"
                            disabled={isCreating}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Just This One
                        </Button>
                        <Button
                            onClick={handleCreateRule}
                            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                            disabled={isCreating || !customPattern.trim()}
                        >
                            {isCreating ? (
                                <>
                                    <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Create Rule
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
