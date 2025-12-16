import { addMonths, differenceInDays, format } from 'date-fns';

export interface Transaction {
  id: string;
  posted_date: string;
  description: string;
  amount: number;
  merchant_key: string;
}

export interface RecurringPattern {
  merchant_key: string;
  merchant_name: string;
  transactions: Transaction[];
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  average_amount: number;
  last_amount: number;
  amount_variance: number;
  confidence: 'high' | 'medium' | 'low';
  occurrence_count: number;
  last_occurrence_date: string;
  next_expected_date: string;
  is_variable: boolean;
  is_subscription: boolean;
  subscription_confidence: number;
}

interface MerchantGroup {
  merchant_key: string;
  transactions: Transaction[];
}

export function detectRecurringCharges(transactions: Transaction[]): RecurringPattern[] {
  const merchantGroups = groupByMerchant(transactions);
  const patterns: RecurringPattern[] = [];

  for (const group of merchantGroups) {
    if (group.transactions.length < 2) continue;

    const sortedTransactions = group.transactions.sort(
      (a, b) => new Date(a.posted_date).getTime() - new Date(b.posted_date).getTime()
    );

    const pattern = analyzePattern(sortedTransactions);
    if (pattern) {
      patterns.push(pattern);
    }
  }

  return patterns.sort((a, b) => b.confidence === 'high' ? 1 : -1);
}

function groupByMerchant(transactions: Transaction[]): MerchantGroup[] {
  const groups = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const key = transaction.merchant_key;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(transaction);
  }

  return Array.from(groups.entries()).map(([merchant_key, transactions]) => ({
    merchant_key,
    transactions,
  }));
}

function analyzePattern(transactions: Transaction[]): RecurringPattern | null {
  if (transactions.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const prev = new Date(transactions[i - 1].posted_date);
    const curr = new Date(transactions[i].posted_date);
    intervals.push(differenceInDays(curr, prev));
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const cadenceResult = determineCadence(avgInterval);

  if (!cadenceResult) return null;

  const amounts = transactions.map(t => Math.abs(t.amount));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const maxAmount = Math.max(...amounts);
  const minAmount = Math.min(...amounts);
  const amountVariance = ((maxAmount - minAmount) / avgAmount) * 100;

  const intervalVariance = calculateVariance(intervals);
  const confidence = determineConfidence(
    transactions.length,
    intervalVariance,
    amountVariance
  );

  if (confidence === 'low' && transactions.length < 3) return null;

  const lastTransaction = transactions[transactions.length - 1];
  const lastDate = new Date(lastTransaction.posted_date);
  const nextDate = calculateNextDate(lastDate, cadenceResult.cadence, cadenceResult.days);

  // Enhanced subscription detection
  const subscriptionAnalysis = analyzeSubscriptionLikelihood(
    transactions,
    cadenceResult.cadence,
    amountVariance,
    intervalVariance
  );

  return {
    merchant_key: transactions[0].merchant_key,
    merchant_name: extractMerchantName(transactions[0].description),
    transactions,
    cadence: cadenceResult.cadence,
    average_amount: parseFloat(avgAmount.toFixed(2)),
    last_amount: parseFloat(Math.abs(lastTransaction.amount).toFixed(2)),
    amount_variance: parseFloat(amountVariance.toFixed(2)),
    confidence,
    occurrence_count: transactions.length,
    last_occurrence_date: lastTransaction.posted_date,
    next_expected_date: format(nextDate, 'yyyy-MM-dd'),
    is_variable: amountVariance > 10,
    is_subscription: subscriptionAnalysis.isLikelySubscription,
    subscription_confidence: subscriptionAnalysis.confidence,
  };
}

function determineCadence(avgInterval: number): { cadence: RecurringPattern['cadence']; days: number } | null {
  if (avgInterval >= 5 && avgInterval <= 9) {
    return { cadence: 'weekly', days: 7 };
  } else if (avgInterval >= 12 && avgInterval <= 16) {
    return { cadence: 'biweekly', days: 14 };
  } else if (avgInterval >= 26 && avgInterval <= 35) {
    return { cadence: 'monthly', days: 30 };
  } else if (avgInterval >= 85 && avgInterval <= 95) {
    return { cadence: 'quarterly', days: 90 };
  } else if (avgInterval >= 350 && avgInterval <= 375) {
    return { cadence: 'annual', days: 365 };
  }
  return null;
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

function determineConfidence(
  occurrenceCount: number,
  intervalVariance: number,
  amountVariance: number
): 'high' | 'medium' | 'low' {
  let score = 0;

  if (occurrenceCount >= 6) score += 3;
  else if (occurrenceCount >= 4) score += 2;
  else if (occurrenceCount >= 2) score += 1;

  if (intervalVariance <= 2) score += 2;
  else if (intervalVariance <= 5) score += 1;

  if (amountVariance <= 5) score += 2;
  else if (amountVariance <= 15) score += 1;

  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function calculateNextDate(lastDate: Date, cadence: RecurringPattern['cadence'], days: number): Date {
  switch (cadence) {
    case 'weekly':
      return new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'biweekly':
      return new Date(lastDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return addMonths(lastDate, 1);
    case 'quarterly':
      return addMonths(lastDate, 3);
    case 'annual':
      return addMonths(lastDate, 12);
  }
}

function extractMerchantName(description: string): string {
  const cleaned = description
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\b(POS|ONLINE|RECURRING|PAYMENT|PURCHASE)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').filter(w => w.length > 0).slice(0, 5);
  return words.map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ') || 'Unknown Merchant';
}

/**
 * Enhanced subscription detection using multiple heuristics
 * Analyzes patterns to determine if a recurring charge is likely a subscription
 */
function analyzeSubscriptionLikelihood(
  transactions: Transaction[],
  cadence: RecurringPattern['cadence'],
  amountVariance: number,
  intervalVariance: number
): { isLikelySubscription: boolean; confidence: number } {
  let score = 0;
  const maxScore = 100;

  const merchantKey = transactions[0].merchant_key.toLowerCase();
  const description = transactions[0].description.toLowerCase();

  // 1. Known subscription keywords (30 points)
  const subscriptionKeywords = [
    'netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'youtube',
    'apple music', 'icloud', 'dropbox', 'adobe', 'microsoft', 'office',
    'gym', 'fitness', 'membership', 'subscription', 'monthly', 'annual',
    'premium', 'pro', 'plus', 'unlimited', 'streaming', 'cloud',
    'saas', 'software', 'app store', 'google play', 'patreon'
  ];

  const hasSubscriptionKeyword = subscriptionKeywords.some(keyword =>
    merchantKey.includes(keyword) || description.includes(keyword)
  );
  if (hasSubscriptionKeyword) score += 30;

  // 2. Consistent amount (20 points)
  // Subscriptions typically have very consistent amounts
  if (amountVariance <= 1) score += 20;
  else if (amountVariance <= 3) score += 15;
  else if (amountVariance <= 5) score += 10;

  // 3. Regular intervals (20 points)
  // Subscriptions have very regular payment intervals
  if (intervalVariance <= 1) score += 20;
  else if (intervalVariance <= 2) score += 15;
  else if (intervalVariance <= 3) score += 10;

  // 4. Monthly or annual cadence (15 points)
  // Most subscriptions are monthly or annual
  if (cadence === 'monthly') score += 15;
  else if (cadence === 'annual') score += 12;
  else if (cadence === 'quarterly') score += 8;
  else if (cadence === 'weekly') score += 5;

  // 5. Occurrence count (15 points)
  // More occurrences = higher confidence
  const occurrences = transactions.length;
  if (occurrences >= 6) score += 15;
  else if (occurrences >= 4) score += 12;
  else if (occurrences >= 3) score += 8;
  else if (occurrences >= 2) score += 5;

  // 6. Amount pattern analysis (10 points)
  // Check for common subscription price points
  const amounts = transactions.map(t => Math.abs(t.amount));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

  const commonPricePoints = [
    4.99, 5.99, 6.99, 7.99, 8.99, 9.99,
    10.99, 11.99, 12.99, 13.99, 14.99, 15.99,
    19.99, 24.99, 29.99, 39.99, 49.99, 99.99
  ];

  const isCommonPricePoint = commonPricePoints.some(price =>
    Math.abs(avgAmount - price) < 0.5
  );
  if (isCommonPricePoint) score += 10;

  const confidence = Math.round((score / maxScore) * 100);
  const isLikelySubscription = score >= 50; // 50% threshold

  return { isLikelySubscription, confidence };
}
