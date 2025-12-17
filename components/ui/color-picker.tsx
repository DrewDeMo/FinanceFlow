'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// Curated color palette for categories
export const CATEGORY_COLORS = [
    // Reds
    { name: 'Red', value: '#EF4444' },
    { name: 'Rose', value: '#F43F5E' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Dark Red', value: '#DC2626' },

    // Oranges
    { name: 'Orange', value: '#F97316' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Yellow', value: '#EAB308' },

    // Greens
    { name: 'Lime', value: '#84CC16' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Emerald', value: '#10B981' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Dark Green', value: '#059669' },

    // Blues
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Sky', value: '#0EA5E9' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Indigo', value: '#6366F1' },

    // Purples
    { name: 'Violet', value: '#8B5CF6' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Fuchsia', value: '#D946EF' },

    // Neutrals
    { name: 'Slate', value: '#64748B' },
    { name: 'Gray', value: '#6B7280' },
    { name: 'Zinc', value: '#71717A' },
    { name: 'Stone', value: '#78716C' },
    { name: 'Brown', value: '#92400E' },
];

interface ColorPickerProps {
    value?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
}

export function ColorPicker({ value, onValueChange, disabled }: ColorPickerProps) {
    const [open, setOpen] = React.useState(false);
    const [customColor, setCustomColor] = React.useState(value || '#6B7280');

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value;
        setCustomColor(newColor);
        onValueChange(newColor);
    };

    const isPresetColor = CATEGORY_COLORS.some(c => c.value.toLowerCase() === value?.toLowerCase());
    const displayColor = value || '#6B7280';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className="w-full justify-start h-10"
                >
                    <div className="flex items-center gap-2 w-full">
                        <div
                            className="h-5 w-5 rounded border border-border flex-shrink-0"
                            style={{ backgroundColor: displayColor }}
                        />
                        <span className="flex-1 text-left">
                            {CATEGORY_COLORS.find(c => c.value.toLowerCase() === displayColor.toLowerCase())?.name || displayColor}
                        </span>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                <div className="p-4 space-y-4">
                    <div>
                        <Label className="text-muted-foreground text-xs font-medium mb-3 block">Preset Colors</Label>
                        <div className="grid grid-cols-6 gap-2">
                            {CATEGORY_COLORS.map((color) => {
                                const isSelected = value?.toLowerCase() === color.value.toLowerCase();

                                return (
                                    <button
                                        key={color.value}
                                        type="button"
                                        className={cn(
                                            'h-10 w-10 rounded-lg border-2 transition-all hover:scale-110 relative group',
                                            isSelected ? 'border-foreground shadow-lg scale-110' : 'border-transparent'
                                        )}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => {
                                            onValueChange(color.value);
                                            setCustomColor(color.value);
                                        }}
                                        title={color.name}
                                    >
                                        {isSelected && (
                                            <Check className="h-5 w-5 text-white absolute inset-0 m-auto drop-shadow-lg" strokeWidth={3} />
                                        )}
                                        <span className="sr-only">{color.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-border">
                        <Label htmlFor="custom-color" className="text-muted-foreground text-xs font-medium mb-2 block">
                            Custom Color
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="custom-color"
                                type="color"
                                value={customColor}
                                onChange={handleCustomColorChange}
                                className="h-10 w-16 p-1 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={customColor}
                                onChange={(e) => {
                                    setCustomColor(e.target.value);
                                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                        onValueChange(e.target.value);
                                    }
                                }}
                                placeholder="#6B7280"
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
