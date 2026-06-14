import { z } from 'zod';
import { ROLE } from '@/commons/constants/permissions';

const assignableRoleValues = [ROLE.MANAGER, ROLE.REVIEWER, ROLE.MEMBER] as [string, ...string[]];

export const inviteMemberSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  role: z.enum(assignableRoleValues),
});

export const changeRoleSchema = z.object({
  role: z.enum(assignableRoleValues),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
