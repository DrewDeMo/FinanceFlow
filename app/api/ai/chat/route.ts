import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { streamChatCompletion, ChatMessage, ModelId, DEFAULT_MODEL, estimateTokenCount } from '@/lib/ai/openai-client';
import { buildFinancialContext, formatFinancialContextForAI, ContextType } from '@/lib/ai/financial-context';
import { buildSystemPromptWithContext } from '@/lib/ai/system-prompts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        // Check for OpenAI API key
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' },
                { status: 500 }
            );
        }

        // Authenticate user
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;
        const body = await request.json();
        const {
            message,
            conversationId,
            contextType = 'monthly' as ContextType,
            model: requestedModel
        } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Get user's preferred model or use requested/default
        let model: ModelId = DEFAULT_MODEL;
        if (requestedModel) {
            model = requestedModel as ModelId;
        } else {
            const { data: preferences } = await supabase
                .from('user_ai_preferences')
                .select('preferred_model')
                .eq('user_id', userId)
                .single();

            if (preferences?.preferred_model) {
                model = preferences.preferred_model as ModelId;
            }
        }

        // Get or create conversation
        let convId = conversationId;
        if (!convId) {
            const { data: newConv, error: convError } = await supabase
                .from('ai_conversations')
                .insert({
                    user_id: userId,
                    context_type: contextType,
                })
                .select('id')
                .single();

            if (convError || !newConv) {
                console.error('Error creating conversation:', convError);
                return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
            }
            convId = newConv.id;
        } else {
            // Verify user owns this conversation
            const { data: existingConv } = await supabase
                .from('ai_conversations')
                .select('id')
                .eq('id', convId)
                .eq('user_id', userId)
                .single();

            if (!existingConv) {
                return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
            }
        }

        // Save user message
        const userTokens = estimateTokenCount(message);
        await supabase
            .from('ai_messages')
            .insert({
                conversation_id: convId,
                role: 'user',
                content: message,
                tokens: userTokens,
                model,
            });

        // Build financial context
        const financialSummary = await buildFinancialContext(userId, contextType);
        const financialContextText = formatFinancialContextForAI(financialSummary);
        const systemPrompt = buildSystemPromptWithContext(financialContextText);

        // Fetch previous messages in this conversation (limit to last 20 for context window)
        const { data: previousMessages } = await supabase
            .from('ai_messages')
            .select('role, content')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })
            .limit(20);

        // Build message array for OpenAI
        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
        ];

        // Add previous messages (excluding the one we just added)
        if (previousMessages) {
            const prevMsgs = previousMessages.slice(0, -1); // Exclude the user message we just added
            prevMsgs.forEach(msg => {
                messages.push({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                });
            });
        }

        // Add current user message
        messages.push({ role: 'user', content: message });

        // Create streaming response
        const encoder = new TextEncoder();
        let fullResponse = '';

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of streamChatCompletion(messages, model)) {
                        fullResponse += chunk;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk, conversationId: convId })}\n\n`));
                    }

                    // Save assistant response after streaming completes
                    const assistantTokens = estimateTokenCount(fullResponse);
                    await supabase
                        .from('ai_messages')
                        .insert({
                            conversation_id: convId,
                            role: 'assistant',
                            content: fullResponse,
                            tokens: assistantTokens,
                            model,
                        });

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`));
                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Failed to process chat request' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
