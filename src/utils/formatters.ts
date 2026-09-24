import { normalizeBDPhoneNumber } from './phoneUtils';

// Format numbers into Bengali digits or comma separated Taka
export function formatTaka(amount: number | string | undefined | null): string {
  const val = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const num = isNaN(val) ? 0 : val;
  const numStr = Math.round(num).toLocaleString('bn-BD');
  return `৳\u00A0${numStr}`;
}

export function formatTakaEn(amount: number | string | undefined | null): string {
  const val = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const num = isNaN(val) ? 0 : val;
  return `৳\u00A0${Math.round(num).toLocaleString('en-IN')}`;
}

// Convert English numbers to Bengali digits
export function toBnDigit(input: number | string | undefined | null): string {
  if (input === undefined || input === null || input === '' || (typeof input === 'number' && isNaN(input))) {
    return '০';
  }
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(input).replace(/[0-9]/g, (w) => bnDigits[parseInt(w, 10)]);
}

// Convert Bengali digits to English numbers
export function toEnDigit(input: string): string {
  const bnDigits = {'০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'};
  return input.replace(/[০-৯]/g, (w) => (bnDigits as Record<string, string>)[w] || w);
}

// Calculate total dozen and remaining pairs
export function pairsToCartonText(totalPairs: number, pairsPerCarton: number = 12): string {
  if (!totalPairs || totalPairs <= 0) return '০ ডজন';
  const cartons = Math.floor(totalPairs / pairsPerCarton);
  const remPairs = totalPairs % pairsPerCarton;

  if (cartons > 0 && remPairs > 0) {
    return `${toBnDigit(cartons)} ডজন ${toBnDigit(remPairs)} জোড়া`;
  } else if (cartons > 0) {
    return `${toBnDigit(cartons)} ডজন`;
  } else {
    return `${toBnDigit(remPairs)} জোড়া`;
  }
}

export const pairsToDozenText = pairsToCartonText;

// Format date into readable Bengali date string
export function formatBnDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const monthsBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const day = toBnDigit(date.getDate());
  const month = monthsBn[date.getMonth()];
  const year = toBnDigit(date.getFullYear());

  return `${day} ${month}, ${year}`;
}

// Get standard YYYY-MM-DD in local browser time zone (avoid UTC shift issues)
export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Clean and normalize phone numbers for consistent comparison
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const clean = normalizeBDPhoneNumber(String(phone));
  if (clean) return clean;
  const enPhone = toEnDigit(String(phone));
  const digits = enPhone.replace(/\D/g, '');
  if (digits.startsWith('880')) {
    return digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return '0' + digits;
  }
  return digits;
}

// Extract exact timestamp from order (supports createdAt, embedded ID timestamp, or parsed date & time)
export function getOrderTimestamp(order?: {
  id?: string;
  memoNo?: string;
  date?: string;
  time?: string;
  createdAt?: number | string;
}): number {
  if (!order) return 0;

  // 1. Direct numeric/string createdAt if available
  if (order.createdAt) {
    if (typeof order.createdAt === 'number' && !isNaN(order.createdAt) && order.createdAt > 0) {
      return order.createdAt;
    }
    const num = Number(order.createdAt);
    if (!isNaN(num) && num > 1000000000000) {
      return num;
    }
    const parsed = new Date(order.createdAt).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 2. Millisecond timestamp embedded inside order ID (e.g. ord-1773657890000, ORD-1773657890000)
  if (order.id) {
    const match = order.id.match(/\d{10,13}/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num >= 1000000000000 && num <= 3000000000000) {
        return num;
      }
      if (num >= 1000000000 && num < 3000000000) {
        return num * 1000;
      }
    }
  }

  // 3. Construct precise millisecond timestamp from date and time
  if (order.date) {
    const parts = order.date.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      let hours = 0;
      let minutes = 0;

      if (order.time) {
        const cleanTime = toEnDigit(order.time).toLowerCase().trim();
        const timeMatch = cleanTime.match(/(\d{1,2})[:.](\d{2})/);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);

          const isPM =
            cleanTime.includes('pm') ||
            cleanTime.includes('অপরাহ্ন') ||
            cleanTime.includes('রাত') ||
            cleanTime.includes('বিকাল') ||
            cleanTime.includes('সন্ধ্যা') ||
            cleanTime.includes('দুপুর');
          const isAM = cleanTime.includes('am') || cleanTime.includes('পূর্বাহ্ন') || cleanTime.includes('সকাল');

          if (isPM && hours < 12) {
            hours += 12;
          } else if (isAM && hours === 12) {
            hours = 0;
          }
        }
      }

      const d = new Date(year, month, day, hours, minutes, 0, 0);
      if (!isNaN(d.getTime())) {
        return d.getTime();
      }
    }
  }

  return 0;
}

// Compare two orders such that the latest / last memo is placed FIRST (সবচেয়ে নতুন মেমো সবার আগে)
export function compareOrdersNewestFirst<
  T extends {
    id?: string;
    memoNo?: string;
    date?: string;
    time?: string;
    createdAt?: number | string;
  }
>(a: T, b: T): number {
  const tsA = getOrderTimestamp(a);
  const tsB = getOrderTimestamp(b);

  if (tsB !== tsA && tsA > 0 && tsB > 0) {
    return tsB - tsA; // Larger timestamp (newer) first
  }

  // If timestamps couldn't be determined or are tied, compare date descending
  if (a.date && b.date && a.date !== b.date) {
    return b.date.localeCompare(a.date);
  }

  // Tie-breaker 1: Extract numeric sequence from memoNo (e.g. MEMO-2026-1050 vs MEMO-2026-1049)
  const numA = a.memoNo ? parseInt(toEnDigit(a.memoNo).replace(/\D/g, ''), 10) : 0;
  const numB = b.memoNo ? parseInt(toEnDigit(b.memoNo).replace(/\D/g, ''), 10) : 0;
  if (numA && numB && numB !== numA) {
    return numB - numA;
  }

  // Tie-breaker 2: String comparison on memoNo or ID descending
  const keyA = `${a.memoNo || ''} ${a.id || ''}`;
  const keyB = `${b.memoNo || ''} ${b.id || ''}`;
  return keyB.localeCompare(keyA);
}



