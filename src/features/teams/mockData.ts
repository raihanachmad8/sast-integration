import type { Team, TeamMember } from '@/commons/types';

/**
 * Mock team data for development and testing.
 * Structured to match the future API response shape.
 */
export const MOCK_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'Security Team',
    slug: 'security',
    description: 'Handles security reviews and vulnerability assessments',
    memberCount: 5,
    projects: ['Backend API', 'Infrastructure'],
    createdAt: '2026-01-15',
  },
  {
    id: 'team-2',
    name: 'Frontend Team',
    slug: 'frontend',
    description: 'Web application development and UI/UX',
    memberCount: 3,
    projects: ['Web Application'],
    createdAt: '2026-02-10',
  },
  {
    id: 'team-3',
    name: 'DevOps Team',
    slug: 'devops',
    description: 'Infrastructure, CI/CD, and deployment',
    memberCount: 2,
    projects: ['Backend API', 'Infrastructure'],
    createdAt: '2026-03-01',
  },
  {
    id: 'team-4',
    name: 'Backend Team',
    slug: 'backend',
    description: 'API development and database management',
    memberCount: 4,
    projects: ['Mobile SDK'],
    createdAt: '2026-01-20',
  },
];

export const MOCK_TEAM_MEMBERS: Record<string, TeamMember[]> = {
  'team-1': [
    { id: 'tm-1', userId: 'user-1', name: 'John Doe', email: 'john@example.com', joinedAt: '2026-01-15' },
    { id: 'tm-2', userId: 'user-2', name: 'Jane Smith', email: 'jane@example.com', joinedAt: '2026-01-20' },
    { id: 'tm-3', userId: 'user-3', name: 'Bob Wilson', email: 'bob@example.com', joinedAt: '2026-02-01' },
    { id: 'tm-4', userId: 'user-4', name: 'Alice Brown', email: 'alice@example.com', joinedAt: '2026-02-15' },
    { id: 'tm-5', userId: 'user-5', name: 'Charlie Davis', email: 'charlie@example.com', joinedAt: '2026-03-01' },
  ],
  'team-2': [
    { id: 'tm-6', userId: 'user-6', name: 'Eve Wilson', email: 'eve@example.com', joinedAt: '2026-02-10' },
    { id: 'tm-7', userId: 'user-7', name: 'Frank Moore', email: 'frank@example.com', joinedAt: '2026-02-20' },
    { id: 'tm-8', userId: 'user-8', name: 'Grace Lee', email: 'grace@example.com', joinedAt: '2026-03-05' },
  ],
  'team-3': [
    { id: 'tm-9', userId: 'user-9', name: 'Henry Taylor', email: 'henry@example.com', joinedAt: '2026-03-01' },
    { id: 'tm-10', userId: 'user-10', name: 'Ivy Chen', email: 'ivy@example.com', joinedAt: '2026-03-10' },
  ],
  'team-4': [
    { id: 'tm-11', userId: 'user-1', name: 'John Doe', email: 'john@example.com', joinedAt: '2026-01-20' },
    { id: 'tm-12', userId: 'user-11', name: 'Jack White', email: 'jack@example.com', joinedAt: '2026-01-25' },
    { id: 'tm-13', userId: 'user-12', name: 'Karen Green', email: 'karen@example.com', joinedAt: '2026-02-05' },
    { id: 'tm-14', userId: 'user-13', name: 'Leo Martinez', email: 'leo@example.com', joinedAt: '2026-02-15' },
  ],
};
