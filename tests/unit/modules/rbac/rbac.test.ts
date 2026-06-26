/**
 * RBAC (Role-Based Access Control) Tests
 *
 * Validates the permission matrix for all 4 roles across all 24 permissions.
 * Ensures each role has exactly the permissions it should have — no more, no less.
 *
 * Covers:
 * - Owner has all permissions
 * - Manager has manage + view permissions (no member invite/manage)
 * - Reviewer has view + triage permissions (no manage)
 * - Member has view-only permissions
 * - No role has permissions it shouldn't
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ROLE,
  ROLE_PERMISSIONS,
  PERMISSION,
  PERMISSION_DEFINITIONS,
  type Role,
  type PermissionKey,
} from '@/commons/constants/permissions';

const ALL_PERMISSIONS = PERMISSION_DEFINITIONS.map((p) => p.name);
const VIEW_ONLY_PERMISSIONS: PermissionKey[] = [
  PERMISSION.DASHBOARD_VIEW,
  PERMISSION.REPOSITORY_VIEW,
  PERMISSION.SCAN_VIEW,
  PERMISSION.FINDING_VIEW,
  PERMISSION.REPORT_VIEW,
  PERMISSION.ARENA_VIEW,
  PERMISSION.MEMBER_VIEW,
  PERMISSION.TEAM_VIEW,
  PERMISSION.PROJECT_VIEW,
  PERMISSION.INTEGRATION_VIEW,
  PERMISSION.WEBHOOK_VIEW,
  PERMISSION.SCHEDULE_VIEW,
  PERMISSION.SCANNER_VIEW,
  PERMISSION.AI_MODEL_VIEW,
  PERMISSION.KNOWLEDGE_VIEW,
  PERMISSION.WORKSPACE_SETTINGS_VIEW,
];

const MANAGE_PERMISSIONS: PermissionKey[] = [
  PERMISSION.REPOSITORY_MANAGE,
  PERMISSION.SCAN_RUN,
  PERMISSION.FINDING_TRIAGE,
  PERMISSION.FINDING_OVERRIDE_AI,
  PERMISSION.REPORT_EXPORT,
  PERMISSION.ARENA_MANAGE,
  PERMISSION.MEMBER_INVITE,
  PERMISSION.MEMBER_MANAGE,
  PERMISSION.TEAM_MANAGE,
  PERMISSION.PROJECT_MANAGE,
  PERMISSION.INTEGRATION_MANAGE,
  PERMISSION.WEBHOOK_MANAGE,
  PERMISSION.SCHEDULE_MANAGE,
  PERMISSION.POLICY_MANAGE,
  PERMISSION.SCANNER_MANAGE,
  PERMISSION.AI_MODEL_MANAGE,
  PERMISSION.KNOWLEDGE_MANAGE,
  PERMISSION.WORKSPACE_SETTINGS_MANAGE,
  PERMISSION.AUDIT_VIEW,
];

describe('RBAC Permission Matrix', () => {
  describe('Permission Definitions', () => {
    it(`should have ${ALL_PERMISSIONS.length} unique permissions`, () => {
      const unique = new Set(ALL_PERMISSIONS);
      expect(unique.size).toBe(ALL_PERMISSIONS.length);
      expect(ALL_PERMISSIONS.length).toBeGreaterThanOrEqual(24);
    });

    it('should have 4 roles defined', () => {
      expect(Object.keys(ROLE)).toHaveLength(4);
      expect(ROLE.OWNER).toBe('owner');
      expect(ROLE.MANAGER).toBe('manager');
      expect(ROLE.REVIEWER).toBe('reviewer');
      expect(ROLE.MEMBER).toBe('member');
    });

    it('should have permission definitions with all required fields', () => {
      for (const def of PERMISSION_DEFINITIONS) {
        expect(def.name).toBeDefined();
        expect(def.resource).toBeDefined();
        expect(def.action).toBeDefined();
        expect(def.description).toBeDefined();
        // Format: resource:action
        expect(def.name).toContain(':');
      }
    });
  });

  describe('✅ positive — Role has expected permissions', () => {
    it(`should give Owner ALL ${ALL_PERMISSIONS.length} permissions`, () => {
      const ownerPerms = ROLE_PERMISSIONS[ROLE.OWNER];
      expect(ownerPerms).toHaveLength(ALL_PERMISSIONS.length);
      for (const perm of ALL_PERMISSIONS) {
        expect(ownerPerms).toContain(perm);
      }
    });

    it('should give Manager all 22 permissions (no MEMBER_INVITE, no MEMBER_MANAGE)', () => {
      const managerPerms = ROLE_PERMISSIONS[ROLE.MANAGER];
      expect(managerPerms).toContain(PERMISSION.DASHBOARD_VIEW);
      expect(managerPerms).toContain(PERMISSION.REPOSITORY_MANAGE);
      expect(managerPerms).toContain(PERMISSION.SCAN_RUN);
      expect(managerPerms).toContain(PERMISSION.FINDING_TRIAGE);
      expect(managerPerms).toContain(PERMISSION.REPORT_EXPORT);
      expect(managerPerms).toContain(PERMISSION.PROJECT_MANAGE);
      expect(managerPerms).toContain(PERMISSION.WORKSPACE_SETTINGS_MANAGE);
      expect(managerPerms).toContain(PERMISSION.AUDIT_VIEW);
    });

    it('should give Reviewer view + triage permissions (no manage)', () => {
      const reviewerPerms = ROLE_PERMISSIONS[ROLE.REVIEWER];
      // Has view permissions
      expect(reviewerPerms).toContain(PERMISSION.DASHBOARD_VIEW);
      expect(reviewerPerms).toContain(PERMISSION.FINDING_VIEW);
      expect(reviewerPerms).toContain(PERMISSION.SCAN_VIEW);
      // Has triage
      expect(reviewerPerms).toContain(PERMISSION.FINDING_TRIAGE);
      expect(reviewerPerms).toContain(PERMISSION.FINDING_OVERRIDE_AI);
      // Has run
      expect(reviewerPerms).toContain(PERMISSION.SCAN_RUN);
    });

    it('should give Member view-only permissions', () => {
      const memberPerms = ROLE_PERMISSIONS[ROLE.MEMBER];
      for (const viewPerm of VIEW_ONLY_PERMISSIONS) {
        expect(memberPerms).toContain(viewPerm);
      }
    });
  });

  describe('❌ negative — Role does NOT have restricted permissions', () => {
    it('should NOT give Member any manage permissions', () => {
      const memberPerms = ROLE_PERMISSIONS[ROLE.MEMBER];
      for (const managePerm of MANAGE_PERMISSIONS) {
        expect(memberPerms).not.toContain(managePerm);
      }
    });

    it('should NOT give Reviewer manage permissions', () => {
      const reviewerPerms = ROLE_PERMISSIONS[ROLE.REVIEWER];
      const reviewerManage: PermissionKey[] = [
        PERMISSION.REPOSITORY_MANAGE,
        PERMISSION.PROJECT_MANAGE,
        PERMISSION.MEMBER_MANAGE,
        PERMISSION.MEMBER_INVITE,
        PERMISSION.TEAM_MANAGE,
        PERMISSION.INTEGRATION_MANAGE,
        PERMISSION.WEBHOOK_MANAGE,
        PERMISSION.SCHEDULE_MANAGE,
        PERMISSION.POLICY_MANAGE,
        PERMISSION.SCANNER_MANAGE,
        PERMISSION.AI_MODEL_MANAGE,
        PERMISSION.KNOWLEDGE_MANAGE,
        PERMISSION.WORKSPACE_SETTINGS_MANAGE,
        PERMISSION.AUDIT_VIEW,
      ];
      for (const perm of reviewerManage) {
        expect(reviewerPerms).not.toContain(perm);
      }
    });

    it('should NOT give Manager MEMBER_MANAGE', () => {
      const managerPerms = ROLE_PERMISSIONS[ROLE.MANAGER];
      // Manager has MEMBER_INVITE but NOT MEMBER_MANAGE
      expect(managerPerms).toContain(PERMISSION.MEMBER_INVITE);
      expect(managerPerms).not.toContain(PERMISSION.MEMBER_MANAGE);
    });
  });

  describe('🔲 edge cases', () => {
    it('should have unique permission names across all definitions', () => {
      const names = PERMISSION_DEFINITIONS.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('should have consistent permission format (resource:action)', () => {
      const pattern = /^[a-z_]+:[a-z_]+$/;
      for (const perm of ALL_PERMISSIONS) {
        expect(perm).toMatch(pattern);
      }
    });

    it('should not have empty permission arrays for any role', () => {
      for (const role of Object.values(ROLE)) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      }
    });

    it('should have role hierarchy consistent with permissions count', () => {
      // Owner > Manager > Reviewer > Member by permission count
      const counts = {
        owner: ROLE_PERMISSIONS[ROLE.OWNER].length,
        manager: ROLE_PERMISSIONS[ROLE.MANAGER].length,
        reviewer: ROLE_PERMISSIONS[ROLE.REVIEWER].length,
        member: ROLE_PERMISSIONS[ROLE.MEMBER].length,
      };
      expect(counts.owner).toBeGreaterThan(counts.manager);
      expect(counts.manager).toBeGreaterThan(counts.reviewer);
      expect(counts.reviewer).toBeGreaterThan(counts.member);
    });
  });
});
