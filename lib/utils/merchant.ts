export function cleanMerchantName(description: string): string {
  let cleaned = description.trim();

  cleaned = cleaned.replace(/\b\d{4,}\b/g, '');

  cleaned = cleaned.replace(/\b(POS|ONLINE|RECURRING|PAYMENT|PURCHASE|DEBIT|CREDIT|ACH|CHECK|TRANSFER)\b/gi, '');

  cleaned = cleaned.replace(/\b[A-Z]{2}\s*\d{5}(-\d{4})?\b/g, '');

  cleaned = cleaned.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, '');

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  cleaned = cleaned.toUpperCase();

  return cleaned || 'UNKNOWN MERCHANT';
}

export function generateMerchantKey(description: string): string {
  const cleaned = cleanMerchantName(description);

  return cleaned
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

export function extractMerchantDisplayName(description: string): string {
  const cleaned = cleanMerchantName(description);

  const words = cleaned.split(' ').filter(word => word.length > 0);
  if (words.length === 0) return 'Unknown';

  const displayName = words
    .slice(0, 5)
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');

  return displayName;
}

export function calculateMerchantSimilarity(merchant1: string, merchant2: string): number {
  const key1 = generateMerchantKey(merchant1);
  const key2 = generateMerchantKey(merchant2);

  if (key1 === key2) return 1.0;

  const words1 = key1.split('_');
  const words2 = key2.split('_');

  const intersection = words1.filter(word => words2.includes(word));
  const union = Array.from(new Set([...words1, ...words2]));

  return intersection.length / union.length;
}
