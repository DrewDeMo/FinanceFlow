import { generateMerchantKey } from './merchant';

export interface FingerprintInput {
  posted_date: string | Date;
  amount: number;
  description: string;
  account_id?: string | null;
}

export function generateTransactionFingerprint(input: FingerprintInput): string {
  const date = typeof input.posted_date === 'string'
    ? input.posted_date
    : input.posted_date.toISOString().split('T')[0];

  const normalizedDate = date.replace(/[^0-9]/g, '');

  const amountInCents = Math.round(Math.abs(input.amount) * 100);

  const merchantKey = generateMerchantKey(input.description);

  const accountPart = input.account_id || 'default';

  const fingerprint = `${normalizedDate}_${amountInCents}_${merchantKey}_${accountPart}`;

  return fingerprint.substring(0, 255);
}

export function hashFingerprint(fingerprint: string): string {
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function generateFingerprintHash(input: FingerprintInput): string {
  const fingerprint = generateTransactionFingerprint(input);
  return hashFingerprint(fingerprint);
}
