/**
 * Normalizes Indian and international phone numbers to E.164 format (+91XXXXXXXXXX)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-digit characters except possibly the leading plus
  const hasPlus = phone.startsWith("+");
  const clean = phone.replace(/\D/g, "");
  
  if (clean.length === 10) {
    // Standard 10 digit Indian number without country code
    return `+91${clean}`;
  }
  
  if (clean.length === 12 && clean.startsWith("91")) {
    // Indian number with country code but no plus sign
    return `+${clean}`;
  }
  
  // For international/fallback cases
  if (clean.length > 0) {
    return hasPlus ? `+${clean}` : `+${clean}`;
  }
  
  return phone.trim();
}
