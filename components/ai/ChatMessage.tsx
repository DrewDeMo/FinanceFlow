'use client';

import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
    role: 'user' | 'assistant' | 'system';
    content: string;
    isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
    const isUser = role === 'user';
    const isAssistant = role === 'assistant';

    // Simple markdown-like formatting for AI responses
    const formatContent = (text: string) => {
        // Split by double newlines for paragraphs
        const paragraphs = text.split(/\n\n+/);

        return paragraphs.map((para, i) => {
            // Check for headers (lines starting with ###, ##, or #)
            if (para.startsWith('### ')) {
                return (
                    <h4 key={i} className="font-semibold text-sm mt-4 mb-2 first:mt-0">
                        {para.replace('### ', '')}
                    </h4>
                );
            }
            if (para.startsWith('## ')) {
                return (
                    <h3 key={i} className="font-semibold text-base mt-4 mb-2 first:mt-0">
                        {para.replace('## ', '')}
                    </h3>
                );
            }
            if (para.startsWith('# ')) {
                return (
                    <h2 key={i} className="font-bold text-lg mt-4 mb-2 first:mt-0">
                        {para.replace('# ', '')}
                    </h2>
                );
            }

            // Check for bullet points
            if (para.includes('\n- ') || para.startsWith('- ')) {
                const items = para.split('\n').filter(line => line.trim());
                return (
                    <ul key={i} className="list-disc list-inside space-y-1 my-2">
                        {items.map((item, j) => (
                            <li key={j} className="text-sm">
                                {item.replace(/^- /, '')}
                            </li>
                        ))}
                    </ul>
                );
            }

            // Check for numbered list
            if (/^\d+\.\s/.test(para)) {
                const items = para.split('\n').filter(line => line.trim());
                return (
                    <ol key={i} className="list-decimal list-inside space-y-1 my-2">
                        {items.map((item, j) => (
                            <li key={j} className="text-sm">
                                {item.replace(/^\d+\.\s/, '')}
                            </li>
                        ))}
                    </ol>
                );
            }

            // Regular paragraph with bold text support
            const formattedText = para.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });

            return (
                <p key={i} className="text-sm leading-relaxed my-2 first:mt-0 last:mb-0">
                    {formattedText}
                </p>
            );
        });
    };

    if (role === 'system') {
        return null; // Don't render system messages
    }

    return (
        <div
            className={cn(
                'flex gap-3 p-4 rounded-lg',
                isUser
                    ? 'bg-primary/5 ml-8'
                    : 'bg-muted/50 mr-8'
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
                <div className="font-medium text-sm mb-1">
                    {isUser ? 'You' : 'Financial Assistant'}
                </div>
                <div className="text-foreground">
                    {formatContent(content)}
                    {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    )}
                </div>
            </div>
        </div>
    );
}
