/** Project form input. */
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
