import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { parseAmount, parseDate, CSVRow, ColumnMapping } from '@/lib/utils/csv-parser';
import { generateMerchantKey } from '@/lib/utils/merchant';
import { generateTransactionFingerprint } from '@/lib/utils/fingerprint';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

interface AnalyzeRequest {
    userId: string;
    rows: CSVRow[];
    mapping: ColumnMapping;
    accountId?: string | null;
}

interface AnalyzedTransaction {
    date: string;
    description: string;
    amount: number;
    fingerprint: string;
    isDuplicate: boolean;
}

interface AnalyzeResponse {
    totalRows: number;
    newTransactions: number;
    duplicates: number;
    errors: number;
    dateRange: {
        earliest: string | null;
        latest: string | null;
    };
    duplicateDetails: AnalyzedTransaction[];
    newTransactionDetails: AnalyzedTransaction[];
    errorDetails: string[];
}

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeRequest = await request.json();
        const { userId, rows, mapping, accountId } = body;

        if (!userId || !rows || !mapping) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate fingerprints for all rows
        const fingerprints: string[] = [];
        const analyzedRows: AnalyzedTransaction[] = [];
        const errorDetails: string[] = [];
        let minDate: string | null = null;
        let maxDate: string | null = null;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                if (!mapping.posted_date || !mapping.description || !mapping.amount) {
                    errorDetails.push(`Row ${i + 1}: Missing required mapping fields`);
                    continue;
                }

                const dateStr = row[mapping.posted_date];
                const description = row[mapping.description];
                const amountStr = row[mapping.amount];

                if (!dateStr || !description || !amountStr) {
                    errorDetails.push(`Row ${i + 1}: Missing date, description, or amount`);
                    continue;
                }

                const posted_date = parseDate(dateStr);
                const amount = parseAmount(amountStr);
                const merchantKey = generateMerchantKey(description);
                const fingerprint = generateTransactionFingerprint({
                    posted_date,
                    amount,
                    description,
                    account_id: accountId,
                });

                fingerprints.push(fingerprint);
                analyzedRows.push({
                    date: posted_date,
                    description,
                    amount,
                    fingerprint,
                    isDuplicate: false, // Will be updated after DB check
                });

                // Track date range
                if (!minDate || posted_date < minDate) minDate = posted_date;
                if (!maxDate || posted_date > maxDate) maxDate = posted_date;
            } catch (err) {
                errorDetails.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Parse error'}`);
            }
        }

        // Check which fingerprints already exist in the database
        const existingFingerprints = new Set<string>();

        if (fingerprints.length > 0) {
            // Query in batches to avoid URL length limits
            const batchSize = 100;
            for (let i = 0; i < fingerprints.length; i += batchSize) {
                const batch = fingerprints.slice(i, i + batchSize);

                const { data: existingTransactions } = await supabase
                    .from('transactions')
                    .select('fingerprint_hash')
                    .eq('user_id', userId)
                    .in('fingerprint_hash', batch);

                if (existingTransactions) {
                    existingTransactions.forEach(t => {
                        existingFingerprints.add(t.fingerprint_hash);
                    });
                }
            }
        }

        // Mark duplicates
        const duplicateDetails: AnalyzedTransaction[] = [];
        const newTransactionDetails: AnalyzedTransaction[] = [];

        analyzedRows.forEach(row => {
            if (existingFingerprints.has(row.fingerprint)) {
                row.isDuplicate = true;
                duplicateDetails.push(row);
            } else {
                newTransactionDetails.push(row);
            }
        });

        const response: AnalyzeResponse = {
            totalRows: rows.length,
            newTransactions: newTransactionDetails.length,
            duplicates: duplicateDetails.length,
            errors: errorDetails.length,
            dateRange: {
                earliest: minDate,
                latest: maxDate,
            },
            duplicateDetails: duplicateDetails.slice(0, 50), // Limit to first 50 for UI
            newTransactionDetails: newTransactionDetails.slice(0, 50), // Limit to first 50 for UI
            errorDetails: errorDetails.slice(0, 20), // Limit errors shown
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Import analysis error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
