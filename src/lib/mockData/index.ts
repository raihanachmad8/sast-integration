/** Centralized mock data for all feature modules. */

// Re-export variant maps and UI constants from commons/types
export {
  SEVERITY_VARIANT,
  FINDING_STATUS_VARIANT,
  VERDICT_VARIANT,
  SCAN_STATUS_VARIANT,
  ROLE_VARIANT,
  ROLE_PILL_CLASS,
  CONNECTION_STATUS_VARIANT,
  REPO_STATUS_VARIANT,
} from '@/commons/types';

// Teams
export { MOCK_TEAMS, MOCK_TEAM_MEMBERS, ALL_WORKSPACE_MEMBERS } from './teams';

// Repositories
export { MOCK_REPOSITORIES, MOCK_SCAN_REPOSITORIES } from './repositories';

// Findings
export {
  MOCK_FINDINGS,
  MOCK_COMMENTS,
  MOCK_MEMBER_LIST,
  MOCK_AI_MODELS,
  getMockScannerOutput,
  getMockAiAnalysis,
  getMockSourceCode,
  getMockAiSuggestion,
} from './findings';

// Findings Helpers (source lines, suggestion code)
export { MOCK_SOURCE_LINES, MOCK_AI_SUGGESTION_CODE } from './findings-helpers';

// Projects
export { MOCK_PROJECTS } from './projects';

// Scan
export {
  MOCK_SCAN_ROWS,
  MOCK_SCAN_REPOSITORIES as MOCK_SCAN_MODAL_REPOSITORIES,
  MOCK_SCAN_DETAILS,
  MOCK_SCAN_FINDINGS,
} from './scan';

// Schedules
export { MOCK_SCHEDULES } from './schedules';

// Knowledge Base
export { MOCK_KNOWLEDGE_BASE } from './knowledge-base';

// Source Control
export { MOCK_REPOS } from './source-control';
export type { RepoCatalog } from './source-control';
