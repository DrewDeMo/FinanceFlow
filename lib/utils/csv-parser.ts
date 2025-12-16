export interface CSVRow {
  [key: string]: string;
}

export interface ParsedCSV {
  headers: string[];
  rows: CSVRow[];
  totalRows: number;
}

export interface ColumnMapping {
  posted_date?: string;
  description?: string;
  amount?: string;
  type?: string;
  category?: string;
  transaction_id?: string;
  account_name?: string;
}

export function parseCSV(csvText: string): ParsedCSV {
  const lines = csvText.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = parseCSVLine(lines[0]);
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      continue;
    }

    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const lowerHeaders = headers.map(h => h.toLowerCase());

  const datePatterns = ['date', 'posted', 'transaction date', 'post date', 'trans date'];
  const descPatterns = ['description', 'merchant', 'payee', 'memo', 'details'];
  const amountPatterns = ['amount', 'debit', 'credit', 'value', 'transaction amount'];
  const typePatterns = ['type', 'transaction type', 'debit/credit'];
  const categoryPatterns = ['category', 'categories'];
  const idPatterns = ['id', 'transaction id', 'reference', 'ref'];
  const accountPatterns = ['account', 'account name', 'card'];

  for (let i = 0; i < lowerHeaders.length; i++) {
    const header = lowerHeaders[i];
    const originalHeader = headers[i];

    if (!mapping.posted_date && datePatterns.some(p => header.includes(p))) {
      mapping.posted_date = originalHeader;
    }
    if (!mapping.description && descPatterns.some(p => header.includes(p))) {
      mapping.description = originalHeader;
    }
    if (!mapping.amount && amountPatterns.some(p => header.includes(p))) {
      mapping.amount = originalHeader;
    }
    if (!mapping.type && typePatterns.some(p => header.includes(p))) {
      mapping.type = originalHeader;
    }
    if (!mapping.category && categoryPatterns.some(p => header.includes(p))) {
      mapping.category = originalHeader;
    }
    if (!mapping.transaction_id && idPatterns.some(p => header.includes(p))) {
      mapping.transaction_id = originalHeader;
    }
    if (!mapping.account_name && accountPatterns.some(p => header.includes(p))) {
      mapping.account_name = originalHeader;
    }
  }

  return mapping;
}

export function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[^0-9.\-]/g, '');

  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }

  return amount;
}

export function parseDate(dateStr: string): string {
  const cleaned = dateStr.trim();

  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/,
    /^(\d{2})\/(\d{2})\/(\d{4})/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})/,
    /^(\d{2})-(\d{2})-(\d{4})/,
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      if (format === formats[0]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else if (format === formats[1]) {
        return `${match[3]}-${match[1]}-${match[2]}`;
      } else if (format === formats[2]) {
        const year = parseInt(match[3]) < 50 ? `20${match[3]}` : `19${match[3]}`;
        const month = match[1].padStart(2, '0');
        const day = match[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else if (format === formats[3]) {
        return `${match[3]}-${match[1]}-${match[2]}`;
      }
    }
  }

  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  throw new Error(`Invalid date format: ${dateStr}`);
}
