/** Members module constants */
export const MEMBER = {
  ERRORS: {
    CANNOT_CHANGE_OWN_ROLE: 'Cannot change your own role',
    CANNOT_ASSIGN_OWNER: 'Cannot assign owner role via API',
    CANNOT_CHANGE_OWNER_ROLE: 'Cannot change workspace owner role',
    CANNOT_REMOVE_SELF: 'Cannot remove yourself from workspace',
    CANNOT_REMOVE_OWNER: 'Cannot remove workspace owner',
    MANAGER_RESTRICTED_ROLE: 'Managers can only assign reviewer or member roles',
    MANAGER_CANNOT_CHANGE_MANAGER: 'Managers cannot change another manager\'s role',
    MANAGER_CANNOT_REMOVE_MANAGER: 'Managers cannot remove another manager',
    MEMBER_NOT_FOUND: 'Member not found in workspace',
  },
  MESSAGES: {
    MEMBERS_LIST: 'Members retrieved',
    ROLE_UPDATED: 'Member role updated',
    MEMBER_REMOVED: 'Member removed',
  },
  ERROR_CODE: 'MEMBER_ERROR',
} as const;
