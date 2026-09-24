/**
 * Utility functions for sanitizing, formatting, and auto-correcting Bangladeshi phone numbers.
 * Supports:
 * - Bengali digits (০-৯) -> auto converted to English ASCII digits
 * - Hyphens, dashes, spaces, parentheses, slashes, plus signs
 * - Multiple numbers in one field (e.g. "01872-259237 / 01712-345678") -> extracts first valid mobile
 * - International formats (+880, 880, 00880) -> normalized
 * - Missing leading zero (e.g. "1872259237" 10 digits) -> prepends 0
 */

const BN_TO_EN_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

/**
 * Converts Bengali digits in any string to standard English 0-9 digits.
 */
export function convertBnToEnDigits(str: string): string {
  if (!str) return '';
  return String(str).replace(/[০-৯]/g, (ch) => BN_TO_EN_MAP[ch] || ch);
}

/**
 * Extracts and normalizes a Bangladeshi mobile number into standard 11-digit format (01XXXXXXXXX).
 * Returns empty string if no valid phone number can be identified.
 */
export function normalizeBDPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';

  // 1. Convert Bengali numerals to English
  const enStr = convertBnToEnDigits(String(rawPhone).trim());

  // 2. Split by common separators if multiple numbers are stored in one field
  const segments = enStr.split(/[/,;|\n\r]+|\s+(?:or|বা|\/)\s+/i);

  for (const seg of segments) {
    const digitsOnly = seg.replace(/\D/g, '');
    if (!digitsOnly) continue;

    // Pattern 1: Standard 11 digits starting with 01[3-9] (with optional 88 or 0088 prefix)
    const matchWithCountryCode = digitsOnly.match(/(?:0088|88)?(01[3-9]\d{8})/);
    if (matchWithCountryCode && matchWithCountryCode[1]) {
      return matchWithCountryCode[1];
    }

    // Pattern 2: 10 digits starting with 1[3-9] (missing leading 0)
    const match10 = digitsOnly.match(/(?:00880|880)?(1[3-9]\d{8})/);
    if (match10 && match10[1]) {
      return '0' + match10[1];
    }

    // Pattern 3: Exactly 11 digits starting with 01
    if (digitsOnly.length === 11 && digitsOnly.startsWith('01')) {
      return digitsOnly;
    }

    // Pattern 4: Exactly 13 digits starting with 8801
    if (digitsOnly.length === 13 && digitsOnly.startsWith('8801')) {
      return digitsOnly.substring(2);
    }
  }

  // Fallback: If only digits remain, check length
  const fallbackDigits = enStr.replace(/\D/g, '');
  if (fallbackDigits.length === 11 && fallbackDigits.startsWith('01')) {
    return fallbackDigits;
  }
  if (fallbackDigits.length === 13 && fallbackDigits.startsWith('8801')) {
    return fallbackDigits.substring(2);
  }
  if (fallbackDigits.length === 10 && fallbackDigits.startsWith('1')) {
    return '0' + fallbackDigits;
  }

  return fallbackDigits;
}

/**
 * Formats a phone number for the SMS Gateway (13-digit format: 8801XXXXXXXXX).
 */
export function formatPhoneForGateway(rawPhone: string): string {
  const normalized = normalizeBDPhoneNumber(rawPhone);
  if (!normalized) return '';

  if (normalized.startsWith('01') && normalized.length === 11) {
    return '88' + normalized;
  }
  if (normalized.startsWith('8801') && normalized.length === 13) {
    return normalized;
  }
  if (normalized.startsWith('1') && normalized.length === 10) {
    return '880' + normalized;
  }

  return normalized;
}

/**
 * Formats a phone number for user display (e.g. 01872-259237).
 */
export function formatPhoneForDisplay(rawPhone: string): string {
  const normalized = normalizeBDPhoneNumber(rawPhone);
  if (normalized && normalized.length === 11 && normalized.startsWith('01')) {
    return `${normalized.substring(0, 5)}-${normalized.substring(5)}`;
  }
  return rawPhone || '';
}

/**
 * Validates whether the given string contains a valid Bangladeshi mobile number.
 */
export function isValidBDPhone(rawPhone: string): boolean {
  const normalized = normalizeBDPhoneNumber(rawPhone);
  return /^01[3-9]\d{8}$/.test(normalized);
}
