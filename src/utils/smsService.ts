import { formatTaka, toBnDigit } from './formatters';

export type SMSType = 'order_delivery' | 'payment_received' | 'due_reminder' | 'order_placed';

export interface SMSPayload {
  phone: string;
  message: string;
}

export function generateSMSMessage(type: SMSType, data: any): string {
  if (type === 'order_placed') {
    const memoNo = data?.memoNo || 'N/A';
    const totalPairs = data?.totalPairs ? toBnDigit(data.totalPairs) : (data?.items ? toBnDigit(data.items.reduce((a: number, b: any) => a + (b.totalPairs || 0), 0)) : '০');
    const grandTotal = data?.grandTotal !== undefined ? formatTaka(data.grandTotal) : (data?.totalBill !== undefined ? formatTaka(data.totalBill) : '৳ ০');
    return `অর্ডার সফলভাবে বুকিং হয়েছে! মেমো: ${memoNo}, মোট: ${totalPairs} জোড়া, আনুমানিক বিল: ${grandTotal} — মেসার্স জান্নাত সুজ।`;
  } else if (type === 'order_delivery') {
    const memoNo = data?.memoNo || 'N/A';
    const totalPairs = data?.totalPairs ? toBnDigit(data.totalPairs) : (data?.items ? toBnDigit(data.items.reduce((a: number, b: any) => a + (b.totalPairs || 0), 0)) : '০');
    const grandTotal = data?.grandTotal !== undefined ? formatTaka(data.grandTotal) : (data?.subTotal !== undefined ? formatTaka(data.subTotal) : '৳ ০');
    const paidAmount = data?.paidAmount || 0;
    const totalNetDue = data?.totalNetDue !== undefined ? data.totalNetDue : (data?.dueAmount || 0);

    let paymentInfo = '';
    if (paidAmount > 0) {
      paymentInfo = ` জমা: ${formatTaka(paidAmount)}।`;
    }

    let dueInfo = '';
    if (totalNetDue > 0) {
      dueInfo = ` বর্তমান বকেয়া: ${formatTaka(totalNetDue)}।`;
    } else {
      dueInfo = ` কোনো বকেয়া নেই (পরিশোধিত)।`;
    }

    return `মেমো নং ${memoNo} ডেলিভারি হয়েছে। মোট: ${totalPairs} জোড়া। বিল: ${grandTotal}।${paymentInfo}${dueInfo} — মেসার্স জান্নাত সুজ।`;
  } else if (type === 'payment_received') {
    const amountPaid = data?.amountPaid ? formatTaka(data.amountPaid) : '০';
    const discountAmount = data?.discountAmount ? data.discountAmount : 0;
    const receiptNo = data?.receiptNo || 'N/A';
    const remainingDue = data?.remainingDue !== undefined ? formatTaka(data.remainingDue) : 'N/A';
    const mowkufText = discountAmount > 0 ? `, এডজাস্ট: ${formatTaka(discountAmount)}` : '';
    return `জমা: ${amountPaid}${mowkufText}। রশিদ নং: ${receiptNo}। বর্তমান অবশিষ্ট বাকী: ${remainingDue} — মেসার্স জান্নাত সুজ।`;
  } else if (type === 'due_reminder') {
    const currentDue = data?.currentDue !== undefined ? formatTaka(data.currentDue) : 'N/A';
    return `প্রিয় গ্রাহক, আপনার বকেয়া টাকার পরিমাণ: ${currentDue}। দ্রুত পরিশোধের বিনীত অনুরোধ রইল — মেসার্স জান্নাত সুজ।`;
  }
  return '';
}

export async function sendAutoSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!phone) {
    return { success: false, error: 'মোবাইল নম্বর পাওয়া যায়নি!' };
  }

  try {
    // Determine Endpoint: Cloudflare/Firebase Functions fallback or local Express API
    const isLocalOrNode = window.location.hostname === 'localhost' || window.location.hostname.includes('run.app');
    
    // In production or custom domains, default to Cloud Function if configured or standard API
    const functionUrl = (import.meta as any).env?.VITE_FIREBASE_FUNCTION_SMS_URL || '/api/send-sms';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, message, to: phone }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText || 'সার্ভার সাড়া দেয়নি।' };
    }

    const result = await response.json();
    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'এসএমএস পাঠাতে সমস্যা হয়েছে।' };
    }
  } catch (err: any) {
    console.error('SMS send fetch error:', err);
    return { success: false, error: err.message || 'নেটওয়ার্ক সংযোগ ত্রুটি।' };
  }
}
