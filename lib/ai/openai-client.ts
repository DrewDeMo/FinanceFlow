import OpenAI from 'openai';

// Available models for user selection
export const AVAILABLE_MODELS = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, best for complex analysis' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Balance of speed and capability' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

export const DEFAULT_MODEL: ModelId = 'gpt-4o-mini';

// Create OpenAI client instance
export function createOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    return new OpenAI({
        apiKey,
    });
}

// Get a singleton instance for server-side usage
let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!openaiInstance) {
        openaiInstance = createOpenAIClient();
    }
    return openaiInstance;
}

// Types for chat messages
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Stream chat completion
export async function* streamChatCompletion(
    messages: ChatMessage[],
    model: ModelId = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
    const openai = getOpenAIClient();

    const stream = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield content;
        }
    }
}

// Non-streaming chat completion for simple queries
export async function chatCompletion(
    messages: ChatMessage[],
    model: ModelId = DEFAULT_MODEL
): Promise<string> {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || '';
}

// Estimate token count (rough approximation)
export function estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
}
