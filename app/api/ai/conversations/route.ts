import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// GET - List all conversations for the user
export async function GET(request: NextRequest) {
    try {
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
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const { data: conversations, error } = await supabase
            .from('ai_conversations')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching conversations:', error);
            return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
        }

        // Get total count
        const { count } = await supabase
            .from('ai_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        return NextResponse.json({
            conversations: conversations || [],
            total: count || 0,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Conversations API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversations' },
            { status: 500 }
        );
    }
}

// POST - Create a new conversation
export async function POST(request: NextRequest) {
    try {
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
        const { title, contextType = 'monthly' } = body;

        const { data: conversation, error } = await supabase
            .from('ai_conversations')
            .insert({
                user_id: userId,
                title: title || 'New Conversation',
                context_type: contextType,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating conversation:', error);
            return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
        }

        return NextResponse.json({ conversation });
    } catch (error) {
        console.error('Conversations API error:', error);
        return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
        );
    }
}

// DELETE - Delete all conversations for the user
export async function DELETE(request: NextRequest) {
    try {
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

        // First delete all messages from user's conversations
        const { data: conversations } = await supabase
            .from('ai_conversations')
            .select('id')
            .eq('user_id', userId);

        if (conversations && conversations.length > 0) {
            const conversationIds = conversations.map(c => c.id);

            // Delete all messages
            await supabase
                .from('ai_messages')
                .delete()
                .in('conversation_id', conversationIds);
        }

        // Delete all conversations
        const { error } = await supabase
            .from('ai_conversations')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting all conversations:', error);
            return NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 });
        }

        return NextResponse.json({ success: true, deleted: conversations?.length || 0 });
    } catch (error) {
        console.error('Conversations API error:', error);
        return NextResponse.json(
            { error: 'Failed to delete conversations' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
