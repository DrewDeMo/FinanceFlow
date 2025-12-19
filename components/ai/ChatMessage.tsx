'use client';

import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import { ReactNode } from 'react';

interface ChatMessageProps {
    role: 'user' | 'assistant' | 'system';
    content: string;
    isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
    const isUser = role === 'user';

    // Format inline text with bold, italic, code, and money highlighting
    const formatInlineText = (text: string): ReactNode[] => {
        // Process bold (**text**), italic (*text* or _text_), inline code (`code`), and money ($XX.XX)
        const parts: ReactNode[] = [];
        let remaining = text;
        let keyIndex = 0;

        while (remaining.length > 0) {
            // Check for bold
            const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
            if (boldMatch) {
                parts.push(<strong key={keyIndex++} className="font-semibold text-foreground">{boldMatch[1]}</strong>);
                remaining = remaining.slice(boldMatch[0].length);
                continue;
            }

            // Check for inline code
            const codeMatch = remaining.match(/^`([^`]+)`/);
            if (codeMatch) {
                parts.push(
                    <code key={keyIndex++} className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                        {codeMatch[1]}
                    </code>
                );
                remaining = remaining.slice(codeMatch[0].length);
                continue;
            }

            // Check for money amounts ($XX.XX or $X,XXX.XX)
            const moneyMatch = remaining.match(/^\$[\d,]+\.?\d*/);
            if (moneyMatch) {
                parts.push(
                    <span key={keyIndex++} className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {moneyMatch[0]}
                    </span>
                );
                remaining = remaining.slice(moneyMatch[0].length);
                continue;
            }

            // Find next special character
            const nextSpecial = remaining.search(/\*\*|`|\$/);
            if (nextSpecial === -1) {
                parts.push(remaining);
                break;
            } else if (nextSpecial === 0) {
                // If we're at a special char but didn't match above, treat it as regular text
                parts.push(remaining[0]);
                remaining = remaining.slice(1);
            } else {
                parts.push(remaining.slice(0, nextSpecial));
                remaining = remaining.slice(nextSpecial);
            }
        }

        return parts;
    };

    // Parse and format the content with proper markdown support
    const formatContent = (text: string) => {
        const lines = text.split('\n');
        const elements: ReactNode[] = [];
        let i = 0;
        let keyIndex = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip empty lines but track them for spacing
            if (trimmedLine === '') {
                i++;
                continue;
            }

            // Headers
            if (trimmedLine.startsWith('### ')) {
                elements.push(
                    <h4 key={keyIndex++} className="font-semibold text-sm mt-4 mb-2 first:mt-0 text-foreground border-b border-border/50 pb-1">
                        {formatInlineText(trimmedLine.slice(4))}
                    </h4>
                );
                i++;
                continue;
            }
            if (trimmedLine.startsWith('## ')) {
                elements.push(
                    <h3 key={keyIndex++} className="font-semibold text-base mt-5 mb-2 first:mt-0 text-foreground border-b border-border pb-1">
                        {formatInlineText(trimmedLine.slice(3))}
                    </h3>
                );
                i++;
                continue;
            }
            if (trimmedLine.startsWith('# ')) {
                elements.push(
                    <h2 key={keyIndex++} className="font-bold text-lg mt-5 mb-3 first:mt-0 text-foreground">
                        {formatInlineText(trimmedLine.slice(2))}
                    </h2>
                );
                i++;
                continue;
            }

            // Bullet points (collect consecutive bullet items)
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
                const listItems: ReactNode[] = [];
                while (i < lines.length) {
                    const bulletLine = lines[i].trim();
                    if (bulletLine.startsWith('- ') || bulletLine.startsWith('• ')) {
                        const content = bulletLine.slice(2);
                        listItems.push(
                            <li key={listItems.length} className="text-sm leading-relaxed pl-1">
                                {formatInlineText(content)}
                            </li>
                        );
                        i++;
                    } else if (bulletLine === '') {
                        i++;
                        break;
                    } else {
                        break;
                    }
                }
                elements.push(
                    <ul key={keyIndex++} className="my-3 ml-4 space-y-1.5 list-disc marker:text-muted-foreground">
                        {listItems}
                    </ul>
                );
                continue;
            }

            // Numbered list (collect consecutive numbered items)
            if (/^\d+[\.\)]\s/.test(trimmedLine)) {
                const listItems: ReactNode[] = [];
                while (i < lines.length) {
                    const numberedLine = lines[i].trim();
                    const match = numberedLine.match(/^\d+[\.\)]\s(.+)/);
                    if (match) {
                        listItems.push(
                            <li key={listItems.length} className="text-sm leading-relaxed pl-1">
                                {formatInlineText(match[1])}
                            </li>
                        );
                        i++;
                    } else if (numberedLine === '') {
                        i++;
                        break;
                    } else {
                        break;
                    }
                }
                elements.push(
                    <ol key={keyIndex++} className="my-3 ml-4 space-y-1.5 list-decimal marker:text-muted-foreground marker:font-medium">
                        {listItems}
                    </ol>
                );
                continue;
            }

            // Check if this looks like a key-value summary line (e.g., "Category: $XXX")
            const kvMatch = trimmedLine.match(/^([^:]+):\s*(.+)$/);
            if (kvMatch && (kvMatch[2].includes('$') || kvMatch[2].match(/^\d/))) {
                elements.push(
                    <div key={keyIndex++} className="flex justify-between items-baseline py-1.5 text-sm border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground">{formatInlineText(kvMatch[1])}</span>
                        <span className="font-medium">{formatInlineText(kvMatch[2])}</span>
                    </div>
                );
                i++;
                continue;
            }

            // Regular paragraph
            elements.push(
                <p key={keyIndex++} className="text-sm leading-relaxed my-2.5 first:mt-0 last:mb-0 text-foreground/90">
                    {formatInlineText(trimmedLine)}
                </p>
            );
            i++;
        }

        return elements;
    };

    if (role === 'system') {
        return null;
    }

    return (
        <div
            className={cn(
                'flex gap-3 p-4 rounded-xl',
                isUser
                    ? 'bg-primary/5 ml-8'
                    : 'bg-card border shadow-sm mr-8'
            )}
        >
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400'
                )}
            >
                {isUser ? (
                    <User className="w-4 h-4" />
                ) : (
                    <Bot className="w-4 h-4" />
                )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="font-medium text-sm mb-2 text-foreground">
                    {isUser ? 'You' : 'Financial Assistant'}
                </div>
                <div className="text-foreground space-y-1">
                    {formatContent(content)}
                    {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 rounded-sm" />
                    )}
                </div>
            </div>
        </div>
    );
}
