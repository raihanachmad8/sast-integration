import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { WORKSPACE_MODE } from '../../src/server/modules/auth/constants';
import { WORKSPACE } from '../../src/server/modules/workspace/constants';
import { ROLE } from '../../src/commons/constants/permissions';
import { ORG_DEFAULTS } from './constants';
import type { SeedModule } from './index';

const ORG_NAME = process.env.ORG_NAME ?? ORG_DEFAULTS.NAME;
const ORG_SLUG = process.env.ORG_SLUG ?? ORG_DEFAULTS.SLUG;

/**
 * Seeds the single organization workspace with admin as owner.
 * Runs only in single mode — in multiple mode workspaces are user-created.
 */
export const workspaceSeed: SeedModule = {
  name: 'workspace',
  description: 'Organization workspace + owner (single mode)',
  shouldRun: (ctx) => ctx.workspaceMode === WORKSPACE_MODE.SINGLE,
  async run({ db, state }) {
    const ownerUserId = state.ownerUserId;
    if (!ownerUserId) return 'skipped — no owner user in context';

    const [workspace] = await db
      .insert(schema.workspaces)
      .values({ name: ORG_NAME, slug: ORG_SLUG, type: WORKSPACE.TYPE.ORGANIZATION, createdBy: ownerUserId, updatedBy: ownerUserId })
      .onConflictDoNothing()
      .returning();

    // Workspace already exists — leave its membership/owner untouched (idempotent).
    if (!workspace) return `"${ORG_SLUG}" already exists`;

    await db.insert(schema.workspaceMembers).values({ workspaceId: workspace.id, userId: ownerUserId, role: ROLE.OWNER });
    await db.update(schema.users).set({ currentWorkspaceId: workspace.id, updatedAt: new Date() }).where(eq(schema.users.id, ownerUserId));

    return `created "${ORG_NAME}" (${ORG_SLUG}), owner assigned`;
  },
};
