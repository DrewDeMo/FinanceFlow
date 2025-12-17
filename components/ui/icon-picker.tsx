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

// Common Lucide icons for categories
export const CATEGORY_ICONS = [
    'Wallet',
    'CreditCard',
    'Banknote',
    'DollarSign',
    'Receipt',
    'PiggyBank',
    'Landmark',
    'TrendingUp',
    'TrendingDown',
    'ShoppingCart',
    'ShoppingBag',
    'Store',
    'Utensils',
    'Coffee',
    'Home',
    'Car',
    'Fuel',
    'Plane',
    'Train',
    'Bus',
    'Bike',
    'Heart',
    'Activity',
    'Dumbbell',
    'Film',
    'Music',
    'Gamepad2',
    'Book',
    'BookOpen',
    'GraduationCap',
    'Briefcase',
    'Laptop',
    'Smartphone',
    'Phone',
    'Tv',
    'Wifi',
    'Zap',
    'Droplet',
    'Gift',
    'Shirt',
    'Scissors',
    'Wrench',
    'Hammer',
    'Package',
    'Tag',
    'Star',
    'Heart',
    'Users',
    'User',
    'Baby',
    'Shield',
    'Umbrella',
    'Calendar',
    'Clock',
    'Bell',
    'Mail',
    'Archive',
    'Trash2',
    'Circle',
    'Square',
    'Triangle',
    'Hexagon',
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

    // Get the selected icon component or default to Circle
    const SelectedIconComponent = React.useMemo(() => {
        if (!value) return LucideIcons.Circle;
        const Icon = (LucideIcons as any)[value];
        return Icon || LucideIcons.Circle;
    }, [value]);

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
                        <SelectedIconComponent className="h-4 w-4" />
                        <span>
                            {value ? value.replace(/([A-Z])/g, ' $1').trim() : 'Select icon...'}
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
                            const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Circle;
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
                                    title={iconName.replace(/([A-Z])/g, ' $1').trim()}
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
