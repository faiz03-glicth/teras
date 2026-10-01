import { z } from 'zod';

export const OTP_LENGTH = 6;

const emailSchema = z.email();

/** PURE: trims and lower-cases before validating, the same way the address is sent. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  return emailSchema.safeParse(normalizeEmail(input)).success;
}

export function isCompleteOtp(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}
