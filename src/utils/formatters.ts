// Format numbers into Bengali digits or comma separated Taka
export function formatTaka(amount: number | string | undefined | null): string {
  const val = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const num = isNaN(val) ? 0 : val;
  const numStr = Math.round(num).toLocaleString('bn-BD');
  return `৳ ${numStr}`;
}

export function formatTakaEn(amount: number | string | undefined | null): string {
  const val = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const num = isNaN(val) ? 0 : val;
  return `৳ ${Math.round(num).toLocaleString('en-IN')}`;
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

