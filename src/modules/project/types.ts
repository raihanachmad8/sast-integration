import type { Project } from '@/commons/types';

/** Project form input — used by create/edit forms. */
export interface ProjectFormInput {
  name: string;
  description: string;
  lead: string;
  teamIds: string[];
  memberIds: string[];
  repositoryIds: string[];
  settings: {
    enforceQualityGate: boolean;
    notifyOnCritical: boolean;
    autoTriggerScan: boolean;
  };
}

/** Payload for creating a new project. */
export type CreateProjectPayload = ProjectFormInput;

/** Payload for updating an existing project. */
export type UpdateProjectPayload = Partial<ProjectFormInput>;
