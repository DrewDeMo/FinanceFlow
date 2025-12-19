import OpenAI from 'openai';

// Available models for user selection
export const AVAILABLE_MODELS = [
    { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest and most capable model' },
    { id: 'gpt-5', name: 'GPT-5', description: 'Advanced reasoning and analysis' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Balanced performance and speed' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Fastest, most cost-effective' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Previous generation, reliable' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Legacy fast model' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

export const DEFAULT_MODEL: ModelId = 'gpt-5-mini';

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

// Check if model is GPT-5 series (uses max_completion_tokens instead of max_tokens)
function isGpt5Model(model: string): boolean {
    return model.startsWith('gpt-5');
}

// Stream chat completion
export async function* streamChatCompletion(
    messages: ChatMessage[],
    model: ModelId = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
    const openai = getOpenAIClient();

    const params: any = {
        model,
        messages,
        stream: true,
    };

    // GPT-5 models use different parameters
    if (isGpt5Model(model)) {
        params.max_completion_tokens = 2000;
        // GPT-5 models only support temperature=1 (default), so we omit it
    } else {
        params.max_tokens = 2000;
        params.temperature = 0.7;
    }

    const stream = await openai.chat.completions.create(params);

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

    const params: any = {
        model,
        messages,
    };

    // GPT-5 models use different parameters
    if (isGpt5Model(model)) {
        params.max_completion_tokens = 2000;
        // GPT-5 models only support temperature=1 (default), so we omit it
    } else {
        params.max_tokens = 2000;
        params.temperature = 0.7;
    }

    const response = await openai.chat.completions.create(params);

    return response.choices[0]?.message?.content || '';
}

// Estimate token count (rough approximation)
export function estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
}
