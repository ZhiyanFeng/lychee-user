/**
 * Formats a date to a human-readable string
 */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

/**
 * Truncates text to a specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Delays execution for a specified time
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Capitalizes first letter of a string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

import { AsYouType, parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Formats phone number (legacy US-only display formatter, e.g. for read-only
 * display of numbers already known to be US). Prefer the E.164 helpers below
 * for anything the user types in.
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

/**
 * Formats raw user input into an international, "as you type" representation
 * (e.g. "+1 415 555 2671"). Intended to be used directly as the `onChangeText`
 * formatter for a phone input so the field always shows a leading "+" and the
 * number grouped for readability, while `toE164` (below) is used to get the
 * canonical E.164 string (e.g. "+14155552671") for storage/submission.
 *
 * Users are expected to always include the country code (e.g. "+1..."),
 * since E.164 has no concept of a "default" country.
 */
export const formatE164Input = (value: string): string => {
  // Keep a leading "+" and strip everything else that isn't a digit.
  const hasPlus = value.trim().startsWith('+');
  const digits = value.replace(/\D/g, '');
  const withPlus = hasPlus || digits.length > 0 ? `+${digits}` : '';
  return new AsYouType().input(withPlus);
};

/**
 * Validates that a phone number is a real, complete number in E.164 format
 * (i.e. it starts with "+" and a valid country calling code, e.g.
 * "+14155552671").
 */
export const isValidE164Phone = (phone: string): boolean => {
  if (!phone.trim().startsWith('+')) return false;
  return isValidPhoneNumber(phone);
};

/**
 * Converts a formatted/partial phone number into the canonical E.164 string
 * (e.g. "+1 415 555 2671" -> "+14155552671"). Returns null if the number
 * isn't valid/complete.
 */
export const toE164 = (phone: string): string | null => {
  const parsed = parsePhoneNumberFromString(phone);
  return parsed && parsed.isValid() ? parsed.number : null;
};

