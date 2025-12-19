'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { ChatMessage } from '@/components/ai/ChatMessage';
import { ChatInput } from '@/components/ai/ChatInput';
import { ConversationList, Conversation } from '@/components/ai/ConversationList';
import { FinancialContextIndicator, ContextType } from '@/components/ai/FinancialContextIndicator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, PanelLeftClose, PanelLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

export default function AIAssistantPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [contextType, setContextType] = useState<ContextType>('monthly');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Scroll to bottom when messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent, scrollToBottom]);

    // Load conversations
    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user]);

    // Load messages when conversation changes
    useEffect(() => {
        if (selectedConversationId) {
            loadMessages(selectedConversationId);
        } else {
            setMessages([]);
        }
    }, [selectedConversationId]);

    const loadConversations = async () => {
        if (!user) return;
        setConversationsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/ai/conversations', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations || []);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setConversationsLoading(false);
        }
    };

    const loadMessages = async (conversationId: string) => {
        if (!user) return;
        setMessagesLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/ai/conversations/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleNewConversation = () => {
        setSelectedConversationId(null);
        setMessages([]);
    };

    const handleDeleteConversation = async (id: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/ai/conversations/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
            });

            if (response.ok) {
                setConversations(prev => prev.filter(c => c.id !== id));
                if (selectedConversationId === id) {
                    setSelectedConversationId(null);
                    setMessages([]);
                }
                toast.success('Conversation deleted');
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            toast.error('Failed to delete conversation');
        }
    };

    const handleClearAllConversations = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/ai/conversations', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setConversations([]);
                setSelectedConversationId(null);
                setMessages([]);
                toast.success(`Cleared ${data.deleted} conversation${data.deleted !== 1 ? 's' : ''}`);
            }
        } catch (error) {
            console.error('Error clearing conversations:', error);
            toast.error('Failed to clear conversations');
        }
    };

    const handleSendMessage = async (message: string) => {
        if (!user || isStreaming) return;

        // Add user message to UI immediately
        const tempUserMessage: Message = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: message,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMessage]);
        setIsStreaming(true);
        setStreamingContent('');
        setApiKeyMissing(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            abortControllerRef.current = new AbortController();

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    conversationId: selectedConversationId,
                    contextType,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error?.includes('API key')) {
                    setApiKeyMissing(true);
                }
                throw new Error(errorData.error || 'Failed to send message');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let newConversationId = selectedConversationId;

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                if (data.error) {
                                    throw new Error(data.error);
                                }

                                if (data.conversationId && !newConversationId) {
                                    newConversationId = data.conversationId;
                                    setSelectedConversationId(newConversationId);
                                }

                                if (data.content) {
                                    fullContent += data.content;
                                    setStreamingContent(fullContent);
                                }

                                if (data.done) {
                                    // Streaming complete
                                }
                            } catch (e) {
                                // Ignore JSON parse errors for incomplete chunks
                            }
                        }
                    }
                }
            }

            // Add assistant message
            if (fullContent) {
                const assistantMessage: Message = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: fullContent,
                    created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, assistantMessage]);
            }

            // Refresh conversations list
            loadConversations();
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Error sending message:', error);
                toast.error(error.message || 'Failed to send message');
                // Remove the temp user message on error
                setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
            }
        } finally {
            setIsStreaming(false);
            setStreamingContent('');
            abortControllerRef.current = null;
        }
    };

    return (
        <div className="flex flex-1 min-h-0 bg-background">
            {/* Sidebar */}
            <div
                className={cn(
                    'bg-card border-r transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden',
                    sidebarOpen ? 'w-72' : 'w-0 border-r-0'
                )}
            >
                <div className="w-72 h-full bg-card">
                    <ConversationList
                        conversations={conversations}
                        selectedId={selectedConversationId || undefined}
                        onSelect={setSelectedConversationId}
                        onNew={handleNewConversation}
                        onDelete={handleDeleteConversation}
                        onClearAll={handleClearAllConversations}
                        isLoading={conversationsLoading}
                    />
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="h-8 w-8"
                        >
                            {sidebarOpen ? (
                                <PanelLeftClose className="h-4 w-4" />
                            ) : (
                                <PanelLeft className="h-4 w-4" />
                            )}
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <h1 className="font-semibold text-sm">Financial Assistant</h1>
                                <p className="text-xs text-muted-foreground">
                                    Ask questions about your finances
                                </p>
                            </div>
                        </div>
                    </div>
                    <FinancialContextIndicator
                        contextType={contextType}
                        onContextTypeChange={setContextType}
                    />
                </div>

                {/* API Key Warning */}
                {apiKeyMissing && (
                    <div className="flex-shrink-0">
                        <Alert variant="destructive" className="m-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    {messagesLoading ? (
                        <div className="absolute inset-0 p-4 overflow-auto">
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-3">
                                        <Skeleton className="w-8 h-8 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-16 w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : messages.length === 0 && !isStreaming ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 overflow-auto">
                            <div className="py-8">
                                <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-4 mx-auto">
                                    <Bot className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                                </div>
                                <h2 className="text-lg font-semibold mb-2">How can I help you today?</h2>
                                <p className="text-muted-foreground text-sm max-w-md mb-6 mx-auto">
                                    I can analyze your spending patterns, identify savings opportunities, and answer questions about your finances.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mx-auto">
                                    {[
                                        'How much did I spend on dining this month?',
                                        'What are my top expense categories?',
                                        'Do I have any subscriptions I should review?',
                                        'How does my spending compare to last month?',
                                    ].map((suggestion, i) => (
                                        <Button
                                            key={i}
                                            variant="outline"
                                            className="text-left h-auto py-3 px-4 justify-start text-sm whitespace-normal"
                                            onClick={() => handleSendMessage(suggestion)}
                                            disabled={isStreaming}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-4 max-w-3xl mx-auto pb-2">
                                {messages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        role={msg.role}
                                        content={msg.content}
                                    />
                                ))}
                                {isStreaming && !streamingContent && (
                                    <div className="flex gap-3 p-4 rounded-xl bg-card border shadow-sm mr-8">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm mb-2 text-foreground">
                                                Financial Assistant
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span>Analyzing your financial data</span>
                                                <span className="flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {isStreaming && streamingContent && (
                                    <ChatMessage
                                        role="assistant"
                                        content={streamingContent}
                                        isStreaming
                                    />
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {/* Input */}
                <div className="flex-shrink-0 p-4 border-t bg-background">
                    <div className="max-w-3xl mx-auto">
                        <ChatInput
                            onSend={handleSendMessage}
                            isLoading={isStreaming}
                            disabled={apiKeyMissing}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
