const VALID_COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+65', '+61'];

export function normalizePhoneNumber(phone: string): string {
  // Strip all non-digit and non-plus characters
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Ensure leading +
  if (!cleaned.startsWith('+')) {
    // Default to India if bare 10-digit number
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else if (!cleaned.startsWith('00')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+' + cleaned.slice(2);
    }
  }

  return cleaned;
}

export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // E.164 format: + followed by 7-15 digits
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) return '***';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}
