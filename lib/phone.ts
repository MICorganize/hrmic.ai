/** Formats a Thai mobile number for display without changing its numeric value. */
export function formatPhone(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Keeps the database value consistent, whether the number was typed or pasted. */
export function toPhoneDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 10);
}
