'use client';

import { CheckCircle2, Upload, FileText, Eye, Loader2, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'processing' | 'complete';

interface ImportStepIndicatorProps {
    currentStep: ImportStep;
}

const steps: { id: ImportStep; label: string; icon: React.ElementType }[] = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'mapping', label: 'Map Columns', icon: FileText },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'processing', label: 'Processing', icon: Loader2 },
    { id: 'complete', label: 'Complete', icon: PartyPopper },
];

export function ImportStepIndicator({ currentStep }: ImportStepIndicatorProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <div className="w-full py-4">
            <div className="flex items-center justify-between relative">
                {/* Background line */}
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0" />

                {/* Progress line */}
                <div
                    className="absolute left-0 top-1/2 h-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 -translate-y-1/2 z-0 transition-all duration-500"
                    style={{
                        width: currentIndex === 0 ? '0%' : `${(currentIndex / (steps.length - 1)) * 100}%`
                    }}
                />

                {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isPending = index > currentIndex;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center">
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                                    isCompleted && 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30',
                                    isCurrent && 'bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-100 dark:ring-blue-900/50 scale-110',
                                    isPending && 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                )}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : isCurrent && step.id === 'processing' ? (
                                    <Icon className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Icon className="w-5 h-5" />
                                )}
                            </div>
                            <span
                                className={cn(
                                    'mt-2 text-xs font-medium transition-colors duration-300',
                                    isCompleted && 'text-purple-600 dark:text-purple-400',
                                    isCurrent && 'text-blue-600 dark:text-blue-400 font-semibold',
                                    isPending && 'text-slate-400 dark:text-slate-500'
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
