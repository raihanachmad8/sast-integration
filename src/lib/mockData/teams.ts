import type { Team, TeamMember } from '@/commons/types';

/**
 * Mock team data for development and testing.
 * Structured to match the future API response shape.
 *
 * @remarks
 * Dates use ISO 8601 format. When replacing with API calls,
 * the response shape should match these types exactly.
 */
export const MOCK_TEAMS: Team[] = [
  {
    id: 'tm_01',
    name: 'Security Team',
    slug: 'security',
    description: 'Handles security reviews and vulnerability assessments',
    memberCount: 5,
    projects: ['Backend API', 'Infrastructure'],
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'tm_02',
    name: 'Frontend Team',
    slug: 'frontend',
    description: 'Web application development and UI/UX',
    memberCount: 3,
    projects: ['Web Application'],
    createdAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'tm_03',
    name: 'DevOps Team',
    slug: 'devops',
    description: 'Infrastructure, CI/CD, and deployment',
    memberCount: 2,
    projects: ['Backend API', 'Infrastructure'],
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'tm_04',
    name: 'Backend Team',
    slug: 'backend',
    description: 'API development and database management',
    memberCount: 4,
    projects: ['Mobile SDK'],
    createdAt: '2026-01-20T00:00:00.000Z',
  },
];

export const MOCK_TEAM_MEMBERS: Record<string, TeamMember[]> = {
  'tm_01': [
    { id: 'tmbr_01', userId: 'usr_01', name: 'Alice Tan', email: 'alice@sast.dev', joinedAt: '2026-01-15T00:00:00.000Z' },
    { id: 'tmbr_02', userId: 'usr_02', name: 'Bob Chen', email: 'bob@sast.dev', joinedAt: '2026-01-20T00:00:00.000Z' },
    { id: 'tmbr_03', userId: 'usr_03', name: 'Carol Lee', email: 'carol@sast.dev', joinedAt: '2026-02-01T00:00:00.000Z' },
    { id: 'tmbr_04', userId: 'usr_04', name: 'Dave Wong', email: 'dave@sast.dev', joinedAt: '2026-02-15T00:00:00.000Z' },
    { id: 'tmbr_05', userId: 'usr_05', name: 'Eve Kumar', email: 'eve@sast.dev', joinedAt: '2026-03-01T00:00:00.000Z' },
  ],
  'tm_02': [
    { id: 'tmbr_06', userId: 'usr_02', name: 'Bob Chen', email: 'bob@sast.dev', joinedAt: '2026-02-10T00:00:00.000Z' },
    { id: 'tmbr_07', userId: 'usr_03', name: 'Carol Lee', email: 'carol@sast.dev', joinedAt: '2026-02-20T00:00:00.000Z' },
    { id: 'tmbr_08', userId: 'usr_04', name: 'Dave Wong', email: 'dave@sast.dev', joinedAt: '2026-03-05T00:00:00.000Z' },
  ],
  'tm_03': [
    { id: 'tmbr_09', userId: 'usr_01', name: 'Alice Tan', email: 'alice@sast.dev', joinedAt: '2026-03-01T00:00:00.000Z' },
    { id: 'tmbr_10', userId: 'usr_05', name: 'Eve Kumar', email: 'eve@sast.dev', joinedAt: '2026-03-10T00:00:00.000Z' },
  ],
  'tm_04': [
    { id: 'tmbr_11', userId: 'usr_01', name: 'Alice Tan', email: 'alice@sast.dev', joinedAt: '2026-01-20T00:00:00.000Z' },
    { id: 'tmbr_12', userId: 'usr_02', name: 'Bob Chen', email: 'bob@sast.dev', joinedAt: '2026-01-25T00:00:00.000Z' },
    { id: 'tmbr_13', userId: 'usr_03', name: 'Carol Lee', email: 'carol@sast.dev', joinedAt: '2026-02-05T00:00:00.000Z' },
    { id: 'tmbr_14', userId: 'usr_04', name: 'Dave Wong', email: 'dave@sast.dev', joinedAt: '2026-02-15T00:00:00.000Z' },
  ],
};

/** Flat list of all workspace members for member pickers. */
export const ALL_WORKSPACE_MEMBERS = Object.values(MOCK_TEAM_MEMBERS)
  .flat()
  .filter((m, i, arr) => arr.findIndex((x) => x.userId === m.userId) === i)
  .map((m) => ({ userId: m.userId, name: m.name, email: m.email }));
