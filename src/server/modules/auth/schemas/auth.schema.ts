import { z } from 'zod';
import { ROLE } from '@/commons/constants/permissions';

const roleValues = Object.values(ROLE) as [string, ...string[]];

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(255),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(255),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(roleValues).default(ROLE.MEMBER),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
