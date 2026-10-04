import { Customer, Order, DuePaymentLog } from '../types';

/**
 * Calculates the true real-time ledger balance for any customer.
 * Positive balance (> 0) means customer owes money (Due/বকেয়া).
 * Negative balance (< 0) means customer has advance deposit (Advance/জমা).
 * 
 * Formula:
 * Initial Due
 * + Sum of (grandTotal - paidAmount) for all valid orders
 * - Sum of (amountPaid + discountAmount) for all direct payment logs
 */
export function calculateCustomerBalance(
  customerId: string,
  customer?: Customer,
  orders: Order[] = [],
  paymentLogs: DuePaymentLog[] = []
): number {
  if (!customerId) return 0;

  const initialDue = Number(customer?.initialDue || 0);

  // Filter orders for this customer (exclude cancelled or trashed)
  const custOrders = orders.filter(
    (o) => o.customerId === customerId && o.status !== ('trashed' as any)
  );

  const ordersNetDue = custOrders.reduce((sum, o) => {
    const bill = Number(o.grandTotal || 0);
    const paid = Number(o.paidAmount || 0);
    return sum + (bill - paid);
  }, 0);

  // Filter payment logs for this customer
  const custPayments = paymentLogs.filter((p) => p.customerId === customerId);

  const directPaymentsTotal = custPayments.reduce((sum, p) => {
    const paid = Number(p.amountPaid || (p as any).amount || 0);
    const discount = Number(p.discountAmount || (p as any).discount || 0);
    return sum + paid + discount;
  }, 0);

  return Math.round((initialDue + ordersNetDue - directPaymentsTotal) * 100) / 100;
}

export interface CustomerTransaction {
  type: 'order' | 'payment';
  id: string;
  memoOrReceiptNo: string;
  date: string;
  timestamp: number;
  bill: number;
  paid: number;
  netChange: number;
  previousBalance: number;
  resultingBalance: number;
  rawOrder?: Order;
  rawPayment?: DuePaymentLog;
}

/**
 * Generates the unified, chronological ledger history of all orders and payments for a customer.
 * Each entry has the exact `previousBalance` before the transaction, and `resultingBalance` after.
 */
export function calculateCustomerTimeline(
  customerId: string,
  customer?: Customer,
  orders: Order[] = [],
  paymentLogs: DuePaymentLog[] = []
): CustomerTransaction[] {
  if (!customerId) return [];

  const initialDue = Number(customer?.initialDue || 0);

  const custOrders = orders.filter(
    (o) => o.customerId === customerId && o.status !== ('trashed' as any)
  );
  const custPayments = paymentLogs.filter((p) => p.customerId === customerId);

  const transactions: Array<{
    type: 'order' | 'payment';
    id: string;
    memoOrReceiptNo: string;
    date: string;
    timestamp: number;
    bill: number;
    paid: number;
    netChange: number;
    rawOrder?: Order;
    rawPayment?: DuePaymentLog;
  }> = [];

  custOrders.forEach((o) => {
    let ts = 0;
    if (typeof o.createdAt === 'number') {
      ts = o.createdAt;
    } else if (typeof o.createdAt === 'string') {
      ts = new Date(o.createdAt).getTime() || 0;
    } else if (o.date) {
      ts = new Date(o.date).getTime() || 0;
    }

    const bill = Number(o.grandTotal || 0);
    const paid = Number(o.paidAmount || 0);
    transactions.push({
      type: 'order',
      id: o.id,
      memoOrReceiptNo: o.memoNo || '',
      date: o.date || '',
      timestamp: ts,
      bill,
      paid,
      netChange: bill - paid,
      rawOrder: o,
    });
  });

  custPayments.forEach((p) => {
    let ts = 0;
    if (typeof (p as any).createdAt === 'number') {
      ts = (p as any).createdAt;
    } else if (typeof (p as any).createdAt === 'string') {
      ts = new Date((p as any).createdAt).getTime() || 0;
    } else if (p.date) {
      ts = new Date(p.date).getTime() || 0;
    }
    const paid = Number(p.amountPaid || (p as any).amount || 0);
    const discount = Number(p.discountAmount || (p as any).discount || 0);
    const totalPaid = paid + discount;
    transactions.push({
      type: 'payment',
      id: p.id,
      memoOrReceiptNo: p.receiptNo || '',
      date: p.date || '',
      timestamp: ts,
      bill: 0,
      paid: totalPaid,
      netChange: -totalPaid,
      rawPayment: p,
    });
  });

  // Sort strictly in chronological order: primary by date, secondary by timestamp
  transactions.sort((a, b) => {
    if (a.date !== b.date) {
      return (a.date || '').localeCompare(b.date || '');
    }
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  let runningBalance = initialDue;
  const result: CustomerTransaction[] = [];

  for (const item of transactions) {
    const prev = runningBalance;
    runningBalance = Math.round((runningBalance + item.netChange) * 100) / 100;
    result.push({
      ...item,
      previousBalance: prev,
      resultingBalance: runningBalance,
    });
  }

  return result;
}

/**
 * Gets the accurate previousDue and totalNetDue for a specific order based on chronological ledger.
 */
export function getOrderAccurateBalances(
  orderId: string,
  customerId: string,
  customer?: Customer,
  orders: Order[] = [],
  paymentLogs: DuePaymentLog[] = []
): { previousDue: number; totalNetDue: number } {
  const timeline = calculateCustomerTimeline(customerId, customer, orders, paymentLogs);
  const match = timeline.find((t) => t.type === 'order' && t.id === orderId);
  if (match) {
    return {
      previousDue: match.previousBalance,
      totalNetDue: match.resultingBalance,
    };
  }

  // Fallback to customer's current balance if not yet in timeline
  const currentBalance = calculateCustomerBalance(customerId, customer, orders, paymentLogs);
  return {
    previousDue: currentBalance,
    totalNetDue: currentBalance,
  };
}
