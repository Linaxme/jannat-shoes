import { Order, DuePaymentLog } from '../types';

/**
 * Generates the next sequential memo number based on existing orders.
 * Format: MEMO-YYYY-XXXX (e.g. MEMO-2026-0001, MEMO-2026-0097)
 */
export function generateNextMemoNo(orders: Order[] = []): string {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `MEMO-${currentYear}-`;

  let maxSeq = 0;
  for (const o of orders) {
    if (!o.memoNo) continue;
    // Extract numeric sequence
    const match = o.memoNo.match(/MEMO-\d{4}-(\d+)/i) || o.memoNo.match(/MEMO-(\d+)/i);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  // Fallback if no matching memos exist
  if (maxSeq === 0 && orders.length > 0) {
    maxSeq = orders.length;
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(4, '0');
  return `${yearPrefix}${padded}`;
}

/**
 * Generates the next sequential money receipt number based on existing payment logs.
 * Format: REC-YYYY-XXXX (e.g. REC-2026-0001, REC-2026-0023)
 */
export function generateNextReceiptNo(paymentLogs: DuePaymentLog[] = []): string {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `REC-${currentYear}-`;

  let maxSeq = 0;
  for (const p of paymentLogs) {
    if (!p.receiptNo) continue;
    // Extract numeric sequence
    const match = p.receiptNo.match(/REC-\d{4}-(\d+)/i) || p.receiptNo.match(/REC-(\d+)/i);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  // Fallback if no matching receipts exist
  if (maxSeq === 0 && paymentLogs.length > 0) {
    maxSeq = paymentLogs.length;
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(4, '0');
  return `${yearPrefix}${padded}`;
}
