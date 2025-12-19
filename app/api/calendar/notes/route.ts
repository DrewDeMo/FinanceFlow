import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Fetch a note for a specific date
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
        }

        const { data: note, error } = await supabase
            .from('calendar_notes')
            .select('*')
            .eq('user_id', user.id)
            .eq('note_date', date)
            .maybeSingle();

        if (error) {
            console.error('Error fetching note:', error);
            return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
        }

        return NextResponse.json({ note });
    } catch (error) {
        console.error('Calendar notes GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create or update a note for a specific date (upsert)
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, content } = body;

        if (!date) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        if (!content || content.trim() === '') {
            // If content is empty, delete the note if it exists
            const { error: deleteError } = await supabase
                .from('calendar_notes')
                .delete()
                .eq('user_id', user.id)
                .eq('note_date', date);

            if (deleteError) {
                console.error('Error deleting note:', deleteError);
                return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
            }

            return NextResponse.json({ note: null, message: 'Note deleted' });
        }

        // Upsert the note (insert or update based on unique constraint)
        const { data: note, error } = await supabase
            .from('calendar_notes')
            .upsert(
                {
                    user_id: user.id,
                    note_date: date,
                    content: content.trim(),
                },
                {
                    onConflict: 'user_id,note_date',
                }
            )
            .select()
            .single();

        if (error) {
            console.error('Error saving note:', error);
            return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
        }

        return NextResponse.json({ note });
    } catch (error) {
        console.error('Calendar notes POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete a note for a specific date
export async function DELETE(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('calendar_notes')
            .delete()
            .eq('user_id', user.id)
            .eq('note_date', date);

        if (error) {
            console.error('Error deleting note:', error);
            return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Calendar notes DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
