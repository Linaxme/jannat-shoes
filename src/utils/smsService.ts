import { formatTaka, toBnDigit } from './formatters';
import { normalizeBDPhoneNumber, formatPhoneForGateway, isValidBDPhone } from './phoneUtils';

export type SMSType = 'order_delivery' | 'payment_received' | 'due_reminder' | 'order_placed' | 'manual_test';

export interface SMSPayload {
  phone: string;
  message: string;
}

export function cleanPhoneNumber(rawPhone: string): string {
  return normalizeBDPhoneNumber(rawPhone);
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

    let paymentInfo = ` জমা: ${formatTaka(paidAmount)}।`;

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
  } else if (type === 'manual_test') {
    return data?.message || `টেস্ট এসএমএস: মেসার্স জান্নাত সুজ সফটওয়্যার থেকে এসএমএস সিস্টেম সক্রিয় রয়েছে।`;
  }
  return '';
}

export const SMS_GATEWAY_URL = 'https://sms.ocs-api.top/api/send-sms';
export const SMS_API_KEY = 'WNULRXBVbfMWJLXQkd99TMVKqY7vXeVpYTMVl9Xu';
export const SMS_SENDER_ID = '8809617626047';

async function sendDirectToGateway(number: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Direct POST to SMS Gateway (Cloudflare-backed with CORS * enabled)
    const res = await fetch(SMS_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        api_key: SMS_API_KEY,
        senderid: SMS_SENDER_ID,
        number: number,
        message: message,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      const isSent = data?.results?.[0]?.status === 'sent' || 
                     (data?.message && String(data.message).toLowerCase().includes('success')) ||
                     data?.results?.[0]?.gateway?.ErrorCode === 0 ||
                     data?.results?.[0]?.gateway?.Data?.[0]?.MessageErrorDescription === 'Success';
      if (isSent) {
        return { success: true };
      }
      return { success: false, error: data?.message || data?.results?.[0]?.message || 'এসএমএস গেটওয়ে রেসপন্স ত্রুটি' };
    }
  } catch (postErr) {
    console.warn('Direct POST to gateway had an error, trying GET fallback...', postErr);
  }

  // 2. Direct GET Fallback (Requires zero preflight OPTIONS request)
  try {
    const getUrl = `${SMS_GATEWAY_URL}?api_key=${encodeURIComponent(SMS_API_KEY)}&senderid=${encodeURIComponent(SMS_SENDER_ID)}&number=${encodeURIComponent(number)}&message=${encodeURIComponent(message)}`;
    const resGet = await fetch(getUrl);
    const dataGet = await resGet.json().catch(() => null);
    if (resGet.ok && dataGet) {
      const isSent = dataGet?.results?.[0]?.status === 'sent' || 
                     (dataGet?.message && String(dataGet.message).toLowerCase().includes('success')) ||
                     dataGet?.results?.[0]?.gateway?.ErrorCode === 0 ||
                     dataGet?.results?.[0]?.gateway?.Data?.[0]?.MessageErrorDescription === 'Success';
      if (isSent) {
        return { success: true };
      }
      return { success: false, error: dataGet?.message || 'এসএমএস গেটওয়ে রেসপন্স ত্রুটি' };
    }
    return { success: false, error: dataGet?.message || `সার্ভার সাড়া দেয়নি (কোড: ${resGet.status})` };
  } catch (getErr: any) {
    console.error('Direct GET to gateway failed:', getErr);
    return { success: false, error: getErr?.message || 'নেটওয়ার্ক সংযোগ ত্রুটি' };
  }
}

export async function sendAutoSMS(phone: string, message: string): Promise<{ success: boolean; error?: string; formattedPhone?: string }> {
  const targetPhone = String(phone || '').trim();
  if (!targetPhone) {
    return { success: false, error: 'মোবাইল নম্বর পাওয়া যায়নি!' };
  }

  // Auto-clean and format phone number (handles Bengali digits, spaces, dashes, +88, etc.)
  const normalized11Digits = normalizeBDPhoneNumber(targetPhone);
  const gatewayFormatted = formatPhoneForGateway(targetPhone);

  if (!normalized11Digits || !isValidBDPhone(normalized11Digits)) {
    return { 
      success: false, 
      error: `মোবাইল নম্বর সঠিক নয় ("${targetPhone}")। ১১ ডিজিটের সঠিক নম্বর দিন (যেমন: 018XXXXXXXX)।` 
    };
  }

  const recipientGatewayPhone = gatewayFormatted || ('88' + normalized11Digits);

  // Strategy 1: Attempt Internal Express Backend Server proxy (/api/send-sms)
  let backendFailed = false;
  let backendError = '';

  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        phone: recipientGatewayPhone, 
        rawPhone: targetPhone,
        cleanPhone: normalized11Digits,
        message, 
        to: recipientGatewayPhone 
      }),
    });

    if (response.ok) {
      const result = await response.json().catch(() => null);
      if (result && result.success) {
        return { success: true, formattedPhone: normalized11Digits };
      } else {
        backendFailed = true;
        backendError = result?.error || 'সার্ভার রেসপন্স ত্রুটি';
      }
    } else {
      backendFailed = true;
      const errorData = await response.json().catch(() => null);
      backendError = errorData?.error || errorData?.message || `সার্ভার সাড়া দেয়নি (কোড: ${response.status})`;
    }
  } catch (err: any) {
    backendFailed = true;
    backendError = err?.message || 'সার্ভার সংযোগ ত্রুটি';
  }

  // Strategy 2: If internal server responded with 405/404/500 or was unreachable, immediately fallback to Direct SMS Gateway
  if (backendFailed) {
    console.info(`Internal /api/send-sms failed (${backendError}). Switching to direct SMS gateway fallback...`);
    const directResult = await sendDirectToGateway(recipientGatewayPhone, message);
    if (directResult.success) {
      return { success: true, formattedPhone: normalized11Digits };
    } else {
      return { success: false, error: directResult.error || backendError || 'এসএমএস পাঠাতে ব্যর্থ হয়েছে' };
    }
  }

  return { success: true, formattedPhone: normalized11Digits };
}
