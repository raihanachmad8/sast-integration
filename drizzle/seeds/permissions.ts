import * as schema from '../schema';
import { PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from '../../src/commons/constants/permissions';
import type { SeedModule } from './index';

/** Seeds the permission catalog and role→permission mappings. Always runs. */
export const permissionsSeed: SeedModule = {
  name: 'permissions',
  description: 'Permission catalog + role mappings',
  shouldRun: () => true,
  async run({ db }) {
    const inserted = await db
      .insert(schema.permissions)
      .values(PERMISSION_DEFINITIONS.map((p) => ({ name: p.name, resource: p.resource, action: p.action, description: p.description })))
      .onConflictDoNothing()
      .returning();

    const allPerms = inserted.length ? inserted : await db.select().from(schema.permissions);
    const permMap = new Map(allPerms.map((p) => [p.name, p.id]));

    const rolePermValues: { role: string; permissionId: string }[] = [];
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const perm of perms) {
        const permId = permMap.get(perm);
        if (permId) rolePermValues.push({ role, permissionId: permId });
      }
    }
    await db.insert(schema.rolePermissions).values(rolePermValues).onConflictDoNothing();

    return `${allPerms.length} permissions, ${rolePermValues.length} role mappings`;
  },
};
