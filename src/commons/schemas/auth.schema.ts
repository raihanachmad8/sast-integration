import { z } from 'zod';

const assignableRoleValues = ['manager', 'reviewer', 'member'] as [string, ...string[]];

export const inviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  role: z.enum(assignableRoleValues, { message: 'Role is required' }).default('member'),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const signupSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string().min(8, 'Confirm your password (at least 8 characters)').max(128),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const signinSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(128),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string().min(8, 'Confirm your password (at least 8 characters)').max(128),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string().min(8, 'Confirm your password (at least 8 characters)').max(128),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
