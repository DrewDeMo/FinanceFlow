import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { buildFinancialContext, formatFinancialContextForAI, ContextType } from '@/lib/ai/financial-context';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// GET - Get financial summary for AI context
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
        const contextType = (searchParams.get('contextType') || 'monthly') as ContextType;
        const format = searchParams.get('format') || 'json'; // 'json' or 'text'

        const summary = await buildFinancialContext(userId, contextType);

        if (format === 'text') {
            const textSummary = formatFinancialContextForAI(summary);
            return NextResponse.json({ summary: textSummary });
        }

        return NextResponse.json({ summary });
    } catch (error) {
        console.error('Financial summary API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch financial summary' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
