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
    id: 'team-1',
    name: 'Security Team',
    slug: 'security',
    description: 'Handles security reviews and vulnerability assessments',
    memberCount: 5,
    projects: ['Backend API', 'Infrastructure'],
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'team-2',
    name: 'Frontend Team',
    slug: 'frontend',
    description: 'Web application development and UI/UX',
    memberCount: 3,
    projects: ['Web Application'],
    createdAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'team-3',
    name: 'DevOps Team',
    slug: 'devops',
    description: 'Infrastructure, CI/CD, and deployment',
    memberCount: 2,
    projects: ['Backend API', 'Infrastructure'],
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'team-4',
    name: 'Backend Team',
    slug: 'backend',
    description: 'API development and database management',
    memberCount: 4,
    projects: ['Mobile SDK'],
    createdAt: '2026-01-20T00:00:00.000Z',
  },
];

export const MOCK_TEAM_MEMBERS: Record<string, TeamMember[]> = {
  'team-1': [
    { id: 'tm-1', userId: 'user-1', name: 'John Doe', email: 'john@example.com', joinedAt: '2026-01-15T00:00:00.000Z' },
    { id: 'tm-2', userId: 'user-2', name: 'Jane Smith', email: 'jane@example.com', joinedAt: '2026-01-20T00:00:00.000Z' },
    { id: 'tm-3', userId: 'user-3', name: 'Bob Wilson', email: 'bob@example.com', joinedAt: '2026-02-01T00:00:00.000Z' },
    { id: 'tm-4', userId: 'user-4', name: 'Alice Brown', email: 'alice@example.com', joinedAt: '2026-02-15T00:00:00.000Z' },
    { id: 'tm-5', userId: 'user-5', name: 'Charlie Davis', email: 'charlie@example.com', joinedAt: '2026-03-01T00:00:00.000Z' },
  ],
  'team-2': [
    { id: 'tm-6', userId: 'user-6', name: 'Eve Wilson', email: 'eve@example.com', joinedAt: '2026-02-10T00:00:00.000Z' },
    { id: 'tm-7', userId: 'user-7', name: 'Frank Moore', email: 'frank@example.com', joinedAt: '2026-02-20T00:00:00.000Z' },
    { id: 'tm-8', userId: 'user-8', name: 'Grace Lee', email: 'grace@example.com', joinedAt: '2026-03-05T00:00:00.000Z' },
  ],
  'team-3': [
    { id: 'tm-9', userId: 'user-9', name: 'Henry Taylor', email: 'henry@example.com', joinedAt: '2026-03-01T00:00:00.000Z' },
    { id: 'tm-10', userId: 'user-10', name: 'Ivy Chen', email: 'ivy@example.com', joinedAt: '2026-03-10T00:00:00.000Z' },
  ],
  'team-4': [
    { id: 'tm-11', userId: 'user-1', name: 'John Doe', email: 'john@example.com', joinedAt: '2026-01-20T00:00:00.000Z' },
    { id: 'tm-12', userId: 'user-11', name: 'Jack White', email: 'jack@example.com', joinedAt: '2026-01-25T00:00:00.000Z' },
    { id: 'tm-13', userId: 'user-12', name: 'Karen Green', email: 'karen@example.com', joinedAt: '2026-02-05T00:00:00.000Z' },
    { id: 'tm-14', userId: 'user-13', name: 'Leo Martinez', email: 'leo@example.com', joinedAt: '2026-02-15T00:00:00.000Z' },
  ],
};

/** Flat list of all workspace members for member pickers. */
export const ALL_WORKSPACE_MEMBERS = Object.values(MOCK_TEAM_MEMBERS)
  .flat()
  .filter((m, i, arr) => arr.findIndex((x) => x.userId === m.userId) === i)
  .map((m) => ({ userId: m.userId, name: m.name, email: m.email }));
