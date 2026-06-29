/** Findings module constants */
export const FINDING = {
  ERRORS: {
    FINDING_NOT_FOUND: 'Finding not found',
    NOT_MEMBER: 'You are not a member of this workspace',
    INVALID_STATUS: 'Invalid finding status',
    INVALID_SEVERITY: 'Invalid finding severity',
    FINDING_IDS_REQUIRED: 'No finding IDs provided',
  },
  MESSAGES: {
    FINDINGS_LIST: 'Findings retrieved',
    FINDING_DETAIL: 'Finding retrieved',
    STATUS_UPDATED: 'Finding status updated',
    FINDING_ASSIGNED: 'Finding assigned',
    BULK_STATUS_UPDATED: 'Findings status updated',
    BULK_ASSIGNED: 'Findings assigned',
  },
  ERROR_CODE: 'FINDING_ERROR',
} as const;
