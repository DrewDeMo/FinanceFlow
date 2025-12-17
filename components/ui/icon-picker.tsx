'use client';

import * as React from 'react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Curated list of relevant financial and lifestyle icons
export const CATEGORY_ICONS = [
    // Money & Finance
    'banknote',
    'circle-dollar-sign',
    'coins',
    'credit-card',
    'landmark',
    'piggy-bank',
    'receipt',
    'wallet',
    'trending-up',
    'trending-down',
    'bar-chart-3',
    'line-chart',

    // Shopping & Food
    'shopping-cart',
    'shopping-bag',
    'store',
    'utensils',
    'coffee',
    'pizza',
    'apple',
    'wine',
    'ice-cream',

    // Transportation
    'car',
    'bike',
    'bus',
    'plane',
    'train',
    'ship',
    'fuel',
    'parking-circle',

    // Home & Utilities
    'home',
    'building',
    'building-2',
    'warehouse',
    'zap',
    'droplet',
    'wifi',
    'phone',
    'smartphone',
    'tv',

    // Health & Fitness
    'heart',
    'heart-pulse',
    'pill',
    'stethoscope',
    'activity',
    'dumbbell',
    'bike',

    // Entertainment & Leisure
    'film',
    'music',
    'gamepad-2',
    'ticket',
    'party-popper',
    'palette',
    'camera',
    'video',

    // Education & Work
    'graduation-cap',
    'book-open',
    'briefcase',
    'laptop',
    'pencil',
    'calendar',

    // Personal Care
    'scissors',
    'shirt',
    'gem',
    'shopping-basket',
    'glasses',

    // Miscellaneous
    'gift',
    'gift-card',
    'shield',
    'umbrella',
    'key',
    'wrench',
    'hammer',
    'paint-bucket',
    'leaf',
    'tree-palm',
    'paw-print',
    'baby',
    'users',
    'user',
    'mail',
    'message-circle',
    'bell',
    'star',
    'award',
    'trophy',
    'flag',
    'bookmark',
    'tag',
    'package',
    'box',
    'archive',
    'file-text',
    'clipboard',
    'calendar-days',
    'clock',
    'timer',
    'hourglass',
    'repeat',
    'refresh-cw',
    'arrow-right-left',
    'arrow-up-right',
    'arrow-down-right',
    'circle',
    'square',
    'triangle',
    'diamond',
    'hexagon',
    'octagon',
    'help-circle',
    'info',
    'alert-circle',
    'alert-triangle',
    'check-circle',
    'x-circle',
    'minus-circle',
    'plus-circle',
    'undo-2',
    'rotate-ccw',
];

interface IconPickerProps {
    value?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
}

export function IconPicker({ value, onValueChange, disabled }: IconPickerProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const filteredIcons = React.useMemo(() => {
        if (!search) return CATEGORY_ICONS;
        return CATEGORY_ICONS.filter((icon) =>
            icon.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    const SelectedIcon = value
        ? (LucideIcons[value as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>)
        : LucideIcons.Circle;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.1] hover:text-white"
                >
                    <div className="flex items-center gap-2">
                        <SelectedIcon className="h-4 w-4" />
                        <span className="capitalize">
                            {value ? value.replace(/-/g, ' ') : 'Select icon...'}
                        </span>
                    </div>
                    <LucideIcons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-slate-900 border-white/[0.1]" align="start">
                <div className="p-3 border-b border-white/[0.1]">
                    <Input
                        placeholder="Search icons..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                    />
                </div>
                <ScrollArea className="h-[300px]">
                    <div className="grid grid-cols-8 gap-1 p-2">
                        {filteredIcons.map((iconName) => {
                            const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
                            const isSelected = value === iconName;

                            return (
                                <Button
                                    key={iconName}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-10 w-10 p-0 hover:bg-white/[0.1]',
                                        isSelected && 'bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50'
                                    )}
                                    onClick={() => {
                                        onValueChange(iconName);
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    title={iconName.replace(/-/g, ' ')}
                                >
                                    <IconComponent className={cn(
                                        'h-4 w-4',
                                        isSelected ? 'text-violet-400' : 'text-slate-400'
                                    )} />
                                </Button>
                            );
                        })}
                    </div>
                    {filteredIcons.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            <LucideIcons.Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No icons found</p>
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
