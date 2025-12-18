export function cleanMerchantName(description: string): string {
  let cleaned = description.trim();

  // Remove common transaction type prefixes
  cleaned = cleaned.replace(/^(PURCHASE|PAYMENT|DEBIT|CREDIT|ACH|CHECK|TRANSFER|POS|ONLINE|RECURRING)\s+/gi, '');

  // Strip asterisk-based reference codes (e.g., *TM0QZ6HK3, *AG7TB42U3)
  // Pattern: * followed by alphanumeric code (usually 6-12 chars)
  cleaned = cleaned.replace(/\*[A-Z0-9]{6,12}/gi, '');

  // Remove pure numeric sequences (transaction IDs, reference numbers)
  cleaned = cleaned.replace(/\b\d{4,}\b/g, '');

  // Remove domain suffixes
  cleaned = cleaned.replace(/\.(COM|NET|ORG|IO|CO)\b/gi, '');

  // Remove business entity suffixes
  cleaned = cleaned.replace(/\b(INC|LLC|LTD|CORP|CO)\b/gi, '');

  // Normalize common merchant variations to standard forms
  const merchantVariations: Record<string, string> = {
    'MKTPL': 'MARKETPLACE',
    'MKTPLACE': 'MARKETPLACE',
    'MARK': 'MARKETPLACE',
    'AMZN': 'AMAZON',
    'SQ ': 'SQUARE ',
    'PYMT': 'PAYMENT',
    'PMTS': 'PAYMENTS',
  };

  Object.entries(merchantVariations).forEach(([pattern, replacement]) => {
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
    cleaned = cleaned.replace(regex, replacement);
  });

  // Remove common words that don't identify the merchant
  cleaned = cleaned.replace(/\b(POS|ONLINE|RECURRING|PAYMENT|PURCHASE|DEBIT|CREDIT|ACH|CHECK|TRANSFER|THE|AND|OF)\b/gi, '');

  // Remove location codes (e.g., "CA 90210", "NY 10001")
  cleaned = cleaned.replace(/\b[A-Z]{2}\s*\d{5}(-\d{4})?\b/g, '');

  // Remove dates in various formats
  cleaned = cleaned.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, '');
  cleaned = cleaned.replace(/\b\d{1,2}-\d{1,2}(-\d{2,4})?\b/g, '');

  // Collapse multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Convert to uppercase for consistency
  cleaned = cleaned.toUpperCase();

  // Apply special normalization for known complex merchants
  cleaned = normalizeKnownMerchants(cleaned);

  return cleaned || 'UNKNOWN MERCHANT';
}

/**
 * Apply special normalization rules for merchants with known complex patterns
 */
function normalizeKnownMerchants(merchantName: string): string {
  let normalized = merchantName;

  // Amazon variations - normalize to just "AMAZON"
  if (normalized.includes('AMAZON')) {
    normalized = 'AMAZON';
  }

  // PayPal variations
  if (normalized.includes('PAYPAL') || normalized.includes('PYPL')) {
    normalized = 'PAYPAL';
  }

  // Starbucks variations
  if (normalized.includes('STARBUCKS') || normalized.includes('SBUX')) {
    normalized = 'STARBUCKS';
  }

  // Square/Cash App
  if (normalized.includes('SQUARE') || normalized.includes('CASH APP')) {
    normalized = 'SQUARE';
  }

  // Walmart variations
  if (normalized.includes('WALMART') || normalized.includes('WAL-MART') || normalized.includes('WMT')) {
    normalized = 'WALMART';
  }

  // Target variations
  if (normalized.includes('TARGET')) {
    normalized = 'TARGET';
  }

  // Uber (separate Uber and Uber Eats)
  if (normalized.includes('UBER EATS')) {
    normalized = 'UBER EATS';
  } else if (normalized.includes('UBER')) {
    normalized = 'UBER';
  }

  // Door Dash variations
  if (normalized.includes('DOORDASH') || normalized.includes('DOOR DASH')) {
    normalized = 'DOORDASH';
  }

  // Venmo
  if (normalized.includes('VENMO')) {
    normalized = 'VENMO';
  }

  // Spotify
  if (normalized.includes('SPOTIFY')) {
    normalized = 'SPOTIFY';
  }

  // Netflix
  if (normalized.includes('NETFLIX')) {
    normalized = 'NETFLIX';
  }

  // Apple (Apple.com, Apple Store, etc.)
  if (normalized.includes('APPLE')) {
    normalized = 'APPLE';
  }

  // Google variations
  if (normalized.includes('GOOGLE') || normalized.includes('GOOG')) {
    normalized = 'GOOGLE';
  }

  // Bathandbodyworks
  if (normalized.includes('BATHANDBODYWORKS') || normalized.includes('BATH AND BODY WORKS') || normalized.includes('BATH BODY WORKS')) {
    normalized = 'BATH_BODY_WORKS';
  }

  return normalized;
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
