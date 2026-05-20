/**
 * Generate a WhatsApp pre-filled message link.
 * Opens in the user's default browser/app.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  // Clean phone number: remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // Ensure it starts with country code (default to +33 for France)
  const withCode = cleaned.startsWith("+") ? cleaned : `+33${cleaned.replace(/^0/, "")}`;
  return `https://wa.me/${withCode.replace("+", "")}?text=${encodeURIComponent(message)}`;
}
