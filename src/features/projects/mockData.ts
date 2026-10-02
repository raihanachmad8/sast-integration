import type { Project } from '@/commons/types';

/**
 * Mock project data for development and testing.
 * Structured to match the future API response shape.
 */
export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Backend API',
    description: 'RESTful API for the main application',
    lead: 'John Doe',
    teams: ['Security Team', 'DevOps Team'],
    members: ['Jane Smith', 'Bob Wilson'],
    repositories: ['backend', 'api'],
    automation: ['Auto scan', 'Gate enforced'],
    createdAt: '2026-01-15',
  },
  {
    id: 'proj-2',
    name: 'Web Application',
    description: 'Frontend SPA for customer portal',
    lead: 'Eve Wilson',
    teams: ['Frontend Team'],
    members: ['Frank Moore'],
    repositories: ['web', 'cdn'],
    automation: ['Auto scan'],
    createdAt: '2026-02-10',
  },
  {
    id: 'proj-3',
    name: 'Mobile SDK',
    description: 'iOS and Android SDK libraries',
    lead: 'Grace Lee',
    teams: ['Backend Team'],
    members: [],
    repositories: ['ios', 'android'],
    automation: [],
    createdAt: '2026-03-01',
  },
  {
    id: 'proj-4',
    name: 'Infrastructure',
    description: 'Terraform and deployment configs',
    lead: 'Henry Taylor',
    teams: ['DevOps Team'],
    members: ['Ivy Chen'],
    repositories: ['infra', 'terraform'],
    automation: ['Gate enforced'],
    createdAt: '2026-03-15',
  },
];
