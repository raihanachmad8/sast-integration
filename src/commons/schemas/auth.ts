/**
 * Shared Zod schemas for authentication.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(signupSchema)
 *   - Frontend: zodResolver(signupSchema)
 */

import { z } from 'zod';

/** Password: 8-128 chars, uppercase, lowercase, digit, special */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one digit')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be at most 255 characters'),
});

export const signinSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['manager', 'reviewer', 'member']).default('member'),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be at most 255 characters'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
