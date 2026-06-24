/**
 * Permission constants — single source of truth.
 * Used by: seed, middleware, UI, role checks.
 * Format: resource:action
 */

export const RESOURCES = {
  DASHBOARD: "dashboard",
  REPOSITORY: "repository",
  SCAN: "scan",
  FINDING: "finding",
  REPORT: "report",
  ARENA: "arena",
  MEMBER: "member",
  TEAM: "team",
  PROJECT: "project",
  INTEGRATION: "integration",
  WEBHOOK: "webhook",
  SCHEDULE: "schedule",
  POLICY: "policy",
  SCANNER: "scanner",
  AI_MODEL: "ai_model",
  KNOWLEDGE: "knowledge",
  WORKSPACE: "workspace",
  AUDIT: "audit",
} as const;

export const ACTIONS = {
  VIEW: "view",
  MANAGE: "manage",
  RUN: "run",
  TRIAGE: "triage",
  OVERRIDE_AI: "override_ai",
  EXPORT: "export",
  INVITE: "invite",
  SETTINGS: "settings",
  READ: "read",
} as const;

export const PERMISSION = {
  // Daily Work
  DASHBOARD_VIEW: `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
  REPOSITORY_VIEW: `${RESOURCES.REPOSITORY}:${ACTIONS.VIEW}`,
  REPOSITORY_MANAGE: `${RESOURCES.REPOSITORY}:${ACTIONS.MANAGE}`,
  SCAN_VIEW: `${RESOURCES.SCAN}:${ACTIONS.VIEW}`,
  SCAN_RUN: `${RESOURCES.SCAN}:${ACTIONS.RUN}`,
  FINDING_VIEW: `${RESOURCES.FINDING}:${ACTIONS.VIEW}`,
  FINDING_TRIAGE: `${RESOURCES.FINDING}:${ACTIONS.TRIAGE}`,
  FINDING_OVERRIDE_AI: `${RESOURCES.FINDING}:${ACTIONS.OVERRIDE_AI}`,
  REPORT_VIEW: `${RESOURCES.REPORT}:${ACTIONS.VIEW}`,
  REPORT_EXPORT: `${RESOURCES.REPORT}:${ACTIONS.EXPORT}`,
  ARENA_MANAGE: `${RESOURCES.ARENA}:${ACTIONS.MANAGE}`,
  // Workspace
  MEMBER_VIEW: `${RESOURCES.MEMBER}:${ACTIONS.VIEW}`,
  MEMBER_INVITE: `${RESOURCES.MEMBER}:${ACTIONS.INVITE}`,
  MEMBER_MANAGE: `${RESOURCES.MEMBER}:${ACTIONS.MANAGE}`,
  TEAM_VIEW: `${RESOURCES.TEAM}:${ACTIONS.VIEW}`,
  TEAM_MANAGE: `${RESOURCES.TEAM}:${ACTIONS.MANAGE}`,
  PROJECT_VIEW: `${RESOURCES.PROJECT}:${ACTIONS.VIEW}`,
  PROJECT_MANAGE: `${RESOURCES.PROJECT}:${ACTIONS.MANAGE}`,
  // Integrations
  INTEGRATION_VIEW: `${RESOURCES.INTEGRATION}:${ACTIONS.VIEW}`,
  INTEGRATION_MANAGE: `${RESOURCES.INTEGRATION}:${ACTIONS.MANAGE}`,
  WEBHOOK_MANAGE: `${RESOURCES.WEBHOOK}:${ACTIONS.MANAGE}`,
  SCHEDULE_MANAGE: `${RESOURCES.SCHEDULE}:${ACTIONS.MANAGE}`,
  // Analysis Policy
  POLICY_VIEW: `${RESOURCES.POLICY}:${ACTIONS.VIEW}`,
  POLICY_MANAGE: `${RESOURCES.POLICY}:${ACTIONS.MANAGE}`,
  SCANNER_MANAGE: `${RESOURCES.SCANNER}:${ACTIONS.MANAGE}`,
  AI_MODEL_VIEW: `${RESOURCES.AI_MODEL}:${ACTIONS.VIEW}`,
  AI_MODEL_MANAGE: `${RESOURCES.AI_MODEL}:${ACTIONS.MANAGE}`,
  // Intelligence
  KNOWLEDGE_VIEW: `${RESOURCES.KNOWLEDGE}:${ACTIONS.READ}`,
  KNOWLEDGE_MANAGE: `${RESOURCES.KNOWLEDGE}:${ACTIONS.MANAGE}`,
  // System
  WORKSPACE_SETTINGS: `${RESOURCES.WORKSPACE}:${ACTIONS.SETTINGS}`,
  WORKSPACE_SETTINGS_VIEW: `${RESOURCES.WORKSPACE}:${ACTIONS.VIEW}`,
  AUDIT_VIEW: `${RESOURCES.AUDIT}:${ACTIONS.READ}`,
} as const;

export type PermissionKey = (typeof PERMISSION)[keyof typeof PERMISSION];

export const ROLE = {
  OWNER: "owner",
  MANAGER: "manager",
  REVIEWER: "reviewer",
  MEMBER: "member",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Role hierarchy — higher number = more permissions. */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLE.OWNER]: 4,
  [ROLE.MANAGER]: 3,
  [ROLE.REVIEWER]: 2,
  [ROLE.MEMBER]: 1,
};

/** All permissions with metadata for seeding */
export const PERMISSION_DEFINITIONS: {
  name: PermissionKey;
  resource: string;
  action: string;
  description: string;
}[] = [
  {
    name: PERMISSION.DASHBOARD_VIEW,
    resource: RESOURCES.DASHBOARD,
    action: ACTIONS.VIEW,
    description: "View dashboard and analytics",
  },
  {
    name: PERMISSION.REPOSITORY_VIEW,
    resource: RESOURCES.REPOSITORY,
    action: ACTIONS.VIEW,
    description: "View repositories and sync status",
  },
  {
    name: PERMISSION.REPOSITORY_MANAGE,
    resource: RESOURCES.REPOSITORY,
    action: ACTIONS.MANAGE,
    description: "Import, configure, and remove repositories",
  },
  {
    name: PERMISSION.SCAN_VIEW,
    resource: RESOURCES.SCAN,
    action: ACTIONS.VIEW,
    description: "View scan results and execution history",
  },
  {
    name: PERMISSION.SCAN_RUN,
    resource: RESOURCES.SCAN,
    action: ACTIONS.RUN,
    description: "Trigger manual scans and manage scan queue",
  },
  {
    name: PERMISSION.FINDING_VIEW,
    resource: RESOURCES.FINDING,
    action: ACTIONS.VIEW,
    description: "Read-only access to findings and AI verdicts",
  },
  {
    name: PERMISSION.FINDING_TRIAGE,
    resource: RESOURCES.FINDING,
    action: ACTIONS.TRIAGE,
    description: "Accept, dismiss, or change finding status",
  },
  {
    name: PERMISSION.FINDING_OVERRIDE_AI,
    resource: RESOURCES.FINDING,
    action: ACTIONS.OVERRIDE_AI,
    description: "Manually override AI-assigned TP/FP verdicts with a reason",
  },
  {
    name: PERMISSION.REPORT_VIEW,
    resource: RESOURCES.REPORT,
    action: ACTIONS.VIEW,
    description: "View generated reports",
  },
  {
    name: PERMISSION.REPORT_EXPORT,
    resource: RESOURCES.REPORT,
    action: ACTIONS.EXPORT,
    description: "Generate and download PDF/XLSX security reports",
  },
  {
    name: PERMISSION.ARENA_MANAGE,
    resource: RESOURCES.ARENA,
    action: ACTIONS.MANAGE,
    description: "Create and review AI comparison runs",
  },
  {
    name: PERMISSION.MEMBER_INVITE,
    resource: RESOURCES.MEMBER,
    action: ACTIONS.INVITE,
    description: "Send workspace invitations to new users",
  },
  {
    name: PERMISSION.MEMBER_MANAGE,
    resource: RESOURCES.MEMBER,
    action: ACTIONS.MANAGE,
    description: "Change roles, revoke access, and manage pending invitations",
  },
  {
    name: PERMISSION.MEMBER_VIEW,
    resource: RESOURCES.MEMBER,
    action: ACTIONS.VIEW,
    description: "View workspace members and their roles",
  },
  {
    name: PERMISSION.TEAM_VIEW,
    resource: RESOURCES.TEAM,
    action: ACTIONS.VIEW,
    description: "View teams and team members",
  },
  {
    name: PERMISSION.TEAM_MANAGE,
    resource: RESOURCES.TEAM,
    action: ACTIONS.MANAGE,
    description: "Create, edit, and delete teams",
  },
  {
    name: PERMISSION.PROJECT_VIEW,
    resource: RESOURCES.PROJECT,
    action: ACTIONS.VIEW,
    description: "View projects and their details",
  },
  {
    name: PERMISSION.PROJECT_MANAGE,
    resource: RESOURCES.PROJECT,
    action: ACTIONS.MANAGE,
    description:
      "Create, edit, and delete projects. Attach repositories and teams",
  },
  {
    name: PERMISSION.INTEGRATION_VIEW,
    resource: RESOURCES.INTEGRATION,
    action: ACTIONS.VIEW,
    description: "View source control provider connections and status",
  },
  {
    name: PERMISSION.INTEGRATION_MANAGE,
    resource: RESOURCES.INTEGRATION,
    action: ACTIONS.MANAGE,
    description: "Connect/disconnect SCM providers",
  },
  {
    name: PERMISSION.WEBHOOK_MANAGE,
    resource: RESOURCES.WEBHOOK,
    action: ACTIONS.MANAGE,
    description: "Create, edit, and delete outgoing webhooks",
  },
  {
    name: PERMISSION.SCHEDULE_MANAGE,
    resource: RESOURCES.SCHEDULE,
    action: ACTIONS.MANAGE,
    description: "Create and manage recurring scan schedules",
  },
  {
    name: PERMISSION.POLICY_VIEW,
    resource: RESOURCES.POLICY,
    action: ACTIONS.VIEW,
    description: "View quality gate and scan policy configuration",
  },
  {
    name: PERMISSION.POLICY_MANAGE,
    resource: RESOURCES.POLICY,
    action: ACTIONS.MANAGE,
    description: "Edit scan policies and quality gates",
  },
  {
    name: PERMISSION.SCANNER_MANAGE,
    resource: RESOURCES.SCANNER,
    action: ACTIONS.MANAGE,
    description: "Configure scanner engines and rules",
  },
  {
    name: PERMISSION.AI_MODEL_VIEW,
    resource: RESOURCES.AI_MODEL,
    action: ACTIONS.VIEW,
    description: "View AI model configuration and status",
  },
  {
    name: PERMISSION.AI_MODEL_MANAGE,
    resource: RESOURCES.AI_MODEL,
    action: ACTIONS.MANAGE,
    description: "Configure AI model chain and prompt presets",
  },
  {
    name: PERMISSION.KNOWLEDGE_VIEW,
    resource: RESOURCES.KNOWLEDGE,
    action: ACTIONS.READ,
    description: "View knowledge base sources and entries",
  },
  {
    name: PERMISSION.KNOWLEDGE_MANAGE,
    resource: RESOURCES.KNOWLEDGE,
    action: ACTIONS.MANAGE,
    description: "Manage knowledge base sources and entries",
  },
  {
    name: PERMISSION.WORKSPACE_SETTINGS,
    resource: RESOURCES.WORKSPACE,
    action: ACTIONS.SETTINGS,
    description: "Edit workspace name, billing, and global configuration",
  },
  {
    name: PERMISSION.WORKSPACE_SETTINGS_VIEW,
    resource: RESOURCES.WORKSPACE,
    action: ACTIONS.VIEW,
    description: "View workspace settings and configuration",
  },
  {
    name: PERMISSION.AUDIT_VIEW,
    resource: RESOURCES.AUDIT,
    action: ACTIONS.READ,
    description: "View audit logs and activity history",
  },
];

/** Role → permissions mapping */
export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  [ROLE.OWNER]: PERMISSION_DEFINITIONS.map((p) => p.name),
  [ROLE.MANAGER]: [
    PERMISSION.DASHBOARD_VIEW,
    PERMISSION.REPOSITORY_VIEW,
    PERMISSION.REPOSITORY_MANAGE,
    PERMISSION.SCAN_VIEW,
    PERMISSION.SCAN_RUN,
    PERMISSION.FINDING_VIEW,
    PERMISSION.FINDING_TRIAGE,
    PERMISSION.FINDING_OVERRIDE_AI,
    PERMISSION.REPORT_VIEW,
    PERMISSION.REPORT_EXPORT,
    PERMISSION.ARENA_MANAGE,
    PERMISSION.MEMBER_VIEW,
    PERMISSION.MEMBER_INVITE,
    PERMISSION.TEAM_VIEW,
    PERMISSION.TEAM_MANAGE,
    PERMISSION.PROJECT_VIEW,
    PERMISSION.PROJECT_MANAGE,
    PERMISSION.SCHEDULE_MANAGE,
    PERMISSION.KNOWLEDGE_VIEW,
    PERMISSION.INTEGRATION_VIEW,
    PERMISSION.POLICY_VIEW,
    PERMISSION.AI_MODEL_VIEW,
    PERMISSION.WORKSPACE_SETTINGS_VIEW,
    PERMISSION.AUDIT_VIEW,
  ],
  [ROLE.REVIEWER]: [
    PERMISSION.DASHBOARD_VIEW,
    PERMISSION.REPOSITORY_VIEW,
    PERMISSION.SCAN_VIEW,
    PERMISSION.SCAN_RUN,
    PERMISSION.FINDING_VIEW,
    PERMISSION.FINDING_TRIAGE,
    PERMISSION.FINDING_OVERRIDE_AI,
    PERMISSION.REPORT_VIEW,
    PERMISSION.REPORT_EXPORT,
    PERMISSION.MEMBER_VIEW,
    PERMISSION.TEAM_VIEW,
    PERMISSION.PROJECT_VIEW,
    PERMISSION.KNOWLEDGE_VIEW,
    PERMISSION.INTEGRATION_VIEW,
    PERMISSION.POLICY_VIEW,
    PERMISSION.AI_MODEL_VIEW,
    PERMISSION.WORKSPACE_SETTINGS_VIEW,
  ],
  [ROLE.MEMBER]: [
    PERMISSION.DASHBOARD_VIEW,
    PERMISSION.REPOSITORY_VIEW,
    PERMISSION.SCAN_VIEW,
    PERMISSION.FINDING_VIEW,
    PERMISSION.REPORT_VIEW,
    PERMISSION.MEMBER_VIEW,
    PERMISSION.TEAM_VIEW,
    PERMISSION.PROJECT_VIEW,
    PERMISSION.KNOWLEDGE_VIEW,
    PERMISSION.WORKSPACE_SETTINGS_VIEW,
  ],
};
