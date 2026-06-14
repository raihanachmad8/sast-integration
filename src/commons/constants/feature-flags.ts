/**
 * Feature flags — env-var based.
 *
 * Each flag maps to a FEATURE_FLAG_* env var.
 * Set to "true" to enable, "false" or unset to disable.
 *
 * @example
 * ```bash
 * # Enable features in .env
 * FEATURE_FLAG_ARENA=true
 * FEATURE_FLAG_WEBHOOKS=false
 * ```
 *
 * @example
 * ```tsx
 * // Check if a feature is enabled
 * import { resolveFeatureFlag, FEATURE_FLAG } from '@/commons/constants/feature-flags';
 *
 * if (resolveFeatureFlag(FEATURE_FLAG.AI_VERIFICATION)) {
 *   // AI verification is enabled
 * }
 *
 * // Get all flags at once
 * import { resolveAllFeatureFlags } from '@/commons/constants/feature-flags';
 *
 * const flags = resolveAllFeatureFlags();
 * if (flags[FEATURE_FLAG.TEAMS]) {
 *   // Teams feature is enabled
 * }
 * ```
 */

export const FEATURE_FLAG = {
  // Core features
  SCAN_MANAGED: 'scan.managed',
  SCAN_EXTERNAL_UPLOAD: 'scan.external_upload',
  AI_VERIFICATION: 'ai.verification',
  QUALITY_GATES: 'quality.gates',

  // Workspace features
  TEAMS: 'teams',
  PROJECTS: 'projects',
  KNOWLEDGE_BASE: 'knowledge_base',
  SCHEDULES: 'schedules',

  // Integrations
  SOURCE_CONTROL_GITHUB: 'integration.github',
  SOURCE_CONTROL_GITLAB: 'integration.gitlab',
  SOURCE_CONTROL_GITEA: 'integration.gitea',
  WEBHOOKS: 'webhooks',

  // Analysis
  SCAN_PROFILES: 'scan_policies',
  SCANNER_ENGINES: 'scanner_engines',
  AI_MODELS: 'models',

  // Reports
  REPORTS: 'reports',
  ARENA: 'arena',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG)[keyof typeof FEATURE_FLAG];

/**
 * Env var name mapping: flag key → env var name.
 */
const FLAG_ENV_MAP: Record<FeatureFlagKey, string> = {
  [FEATURE_FLAG.SCAN_MANAGED]: 'FEATURE_FLAG_SCAN_MANAGED',
  [FEATURE_FLAG.SCAN_EXTERNAL_UPLOAD]: 'FEATURE_FLAG_SCAN_EXTERNAL_UPLOAD',
  [FEATURE_FLAG.AI_VERIFICATION]: 'FEATURE_FLAG_AI_VERIFICATION',
  [FEATURE_FLAG.QUALITY_GATES]: 'FEATURE_FLAG_QUALITY_GATES',
  [FEATURE_FLAG.TEAMS]: 'FEATURE_FLAG_TEAMS',
  [FEATURE_FLAG.PROJECTS]: 'FEATURE_FLAG_PROJECTS',
  [FEATURE_FLAG.KNOWLEDGE_BASE]: 'FEATURE_FLAG_KNOWLEDGE_BASE',
  [FEATURE_FLAG.SCHEDULES]: 'FEATURE_FLAG_SCHEDULES',
  [FEATURE_FLAG.SOURCE_CONTROL_GITHUB]: 'FEATURE_FLAG_SOURCE_CONTROL_GITHUB',
  [FEATURE_FLAG.SOURCE_CONTROL_GITLAB]: 'FEATURE_FLAG_SOURCE_CONTROL_GITLAB',
  [FEATURE_FLAG.SOURCE_CONTROL_GITEA]: 'FEATURE_FLAG_SOURCE_CONTROL_GITEA',
  [FEATURE_FLAG.WEBHOOKS]: 'FEATURE_FLAG_WEBHOOKS',
  [FEATURE_FLAG.SCAN_PROFILES]: 'FEATURE_FLAG_SCAN_PROFILES',
  [FEATURE_FLAG.SCANNER_ENGINES]: 'FEATURE_FLAG_SCANNER_ENGINES',
  [FEATURE_FLAG.AI_MODELS]: 'FEATURE_FLAG_AI_MODELS',
  [FEATURE_FLAG.REPORTS]: 'FEATURE_FLAG_REPORTS',
  [FEATURE_FLAG.ARENA]: 'FEATURE_FLAG_ARENA',
};

/**
 * Default states when env var is not set.
 * true = enabled by default, false = disabled by default.
 */
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  [FEATURE_FLAG.SCAN_MANAGED]: true,
  [FEATURE_FLAG.SCAN_EXTERNAL_UPLOAD]: true,
  [FEATURE_FLAG.AI_VERIFICATION]: true,
  [FEATURE_FLAG.QUALITY_GATES]: true,
  [FEATURE_FLAG.TEAMS]: true,
  [FEATURE_FLAG.PROJECTS]: true,
  [FEATURE_FLAG.KNOWLEDGE_BASE]: true,
  [FEATURE_FLAG.SCHEDULES]: true,
  [FEATURE_FLAG.SOURCE_CONTROL_GITHUB]: true,
  [FEATURE_FLAG.SOURCE_CONTROL_GITLAB]: true,
  [FEATURE_FLAG.SOURCE_CONTROL_GITEA]: true,
  [FEATURE_FLAG.WEBHOOKS]: true,
  [FEATURE_FLAG.SCAN_PROFILES]: true,
  [FEATURE_FLAG.SCANNER_ENGINES]: true,
  [FEATURE_FLAG.AI_MODELS]: true,
  [FEATURE_FLAG.REPORTS]: true,
  [FEATURE_FLAG.ARENA]: false,
};

/**
 * Resolve a feature flag value from environment variables.
 * Falls back to hardcoded default if env var is not set.
 */
export function resolveFeatureFlag(flag: FeatureFlagKey): boolean {
  const envVar = FLAG_ENV_MAP[flag];
  const envValue = process.env[envVar];

  if (envValue === undefined) {
    return FEATURE_FLAG_DEFAULTS[flag] ?? false;
  }

  return envValue === 'true' || envValue === '1';
}

/**
 * Resolve all feature flags from environment variables.
 * Returns a map of flag keys to enabled states.
 */
export function resolveAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const result = {} as Record<FeatureFlagKey, boolean>;
  const allFlags = Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[];

  for (const flag of allFlags) {
    result[flag] = resolveFeatureFlag(flag);
  }

  return result;
}

/**
 * Human-readable labels for feature flags (used in admin UI).
 */
export const FEATURE_FLAG_LABELS: Record<FeatureFlagKey, string> = {
  [FEATURE_FLAG.SCAN_MANAGED]: 'Managed Scanning',
  [FEATURE_FLAG.SCAN_EXTERNAL_UPLOAD]: 'External CI Upload',
  [FEATURE_FLAG.AI_VERIFICATION]: 'AI Verification',
  [FEATURE_FLAG.QUALITY_GATES]: 'Quality Gates',
  [FEATURE_FLAG.TEAMS]: 'Teams',
  [FEATURE_FLAG.PROJECTS]: 'Projects',
  [FEATURE_FLAG.KNOWLEDGE_BASE]: 'Knowledge Base',
  [FEATURE_FLAG.SCHEDULES]: 'Scheduled Scans',
  [FEATURE_FLAG.SOURCE_CONTROL_GITHUB]: 'GitHub Integration',
  [FEATURE_FLAG.SOURCE_CONTROL_GITLAB]: 'GitLab Integration',
  [FEATURE_FLAG.SOURCE_CONTROL_GITEA]: 'Gitea Integration',
  [FEATURE_FLAG.WEBHOOKS]: 'Outgoing Webhooks',
  [FEATURE_FLAG.SCAN_PROFILES]: 'Scan Policies',
  [FEATURE_FLAG.SCANNER_ENGINES]: 'Scanner Engines',
  [FEATURE_FLAG.AI_MODELS]: 'AI Models',
  [FEATURE_FLAG.REPORTS]: 'Reports',
  [FEATURE_FLAG.ARENA]: 'Arena (AI Comparison)',
};
