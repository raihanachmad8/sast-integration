/**
 * Shared Zod schemas — single source of truth for validation.
 *
 * Usage:
 *   Backend: import { signupSchema } from '@/commons/schemas'
 *   Frontend: import { signupSchema } from '@/commons/schemas'
 *             useForm({ resolver: zodResolver(signupSchema) })
 */

export {
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteSchema,
  acceptInviteSchema,
  type SignupInput,
  type SigninInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type InviteInput,
  type AcceptInviteInput,
} from './auth';

export {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  switchWorkspaceSchema,
  updateRoleSchema,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type SwitchWorkspaceInput,
  type UpdateRoleInput,
} from './workspace';

export {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project';

export {
  createTeamSchema,
  updateTeamSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
} from './team';

export {
  createScanProfileSchema,
  updateScanProfileSchema,
  type CreateScanProfileInput,
  type UpdateScanProfileInput,
} from './scan-profile';

export {
  createApiTokenSchema,
  type CreateApiTokenInput,
} from './api-token';

export {
  createAiModelSchema,
  updateAiModelSchema,
  type CreateAiModelInput,
  type UpdateAiModelInput,
} from './model';

export {
  createWebhookSchema,
  updateWebhookSchema,
  type CreateWebhookInput,
  type UpdateWebhookInput,
} from './webhook';

export {
  updateQualityGateSchema,
  qualityGateConfigSchema,
  evaluateQualityGateSchema,
  type UpdateQualityGateInput,
  type QualityGateConfigInput,
  type EvaluateQualityGateInput,
} from './quality-gate';

export {
  createKnowledgeSourceSchema,
  updateKnowledgeSourceSchema,
  createKnowledgeEntrySchema,
  updateKnowledgeEntrySchema,
  type CreateKnowledgeSourceInput,
  type UpdateKnowledgeSourceInput,
  type CreateKnowledgeEntryInput,
  type UpdateKnowledgeEntryInput,
} from './knowledge-base';

export {
  createScheduleSchema,
  updateScheduleSchema,
  type CreateScheduleInput,
  type UpdateScheduleInput,
} from './schedule';

export {
  createSourceControlSchema,
  updateSourceControlSchema,
  type CreateSourceControlInput,
  type UpdateSourceControlInput,
} from './source-control';

export {
  updateProfileSchema,
  type UpdateProfileInput,
} from './profile';
