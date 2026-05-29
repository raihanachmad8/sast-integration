import * as fs from 'node:fs';
import * as path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hash } from 'bcryptjs';
import * as schema from './schema';

const cwd = process.cwd();
const envPaths = [path.resolve(cwd, '.env.local'), path.resolve(cwd, '.env')];
if (typeof process.loadEnvFile === 'function') {
  for (const filePath of envPaths) {
    if (fs.existsSync(filePath)) {
      process.loadEnvFile(filePath);
      break;
    }
  }
}

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'root'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'sast_db'}`;

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql, { schema });

const PERMISSIONS = [
  // Daily Work
  { resource: 'dashboard', action: 'view', description: 'View dashboard and analytics' },
  { resource: 'repository', action: 'view', description: 'View repositories and sync status' },
  { resource: 'repository', action: 'manage', description: 'Import, configure, and remove repositories' },
  { resource: 'scan', action: 'view', description: 'View scan results and execution history' },
  { resource: 'scan', action: 'run', description: 'Trigger manual scans and manage scan queue' },
  { resource: 'finding', action: 'view', description: 'Read-only access to findings and AI verdicts' },
  { resource: 'finding', action: 'triage', description: 'Accept, dismiss, or change finding status' },
  { resource: 'finding', action: 'override_ai', description: 'Manually override AI-assigned TP/FP verdicts with a reason' },
  { resource: 'report', action: 'view', description: 'View generated reports' },
  { resource: 'report', action: 'export', description: 'Generate and download PDF/XLSX security reports' },
  { resource: 'arena', action: 'manage', description: 'Create and review AI comparison runs' },
  // Workspace
  { resource: 'member', action: 'invite', description: 'Send workspace invitations to new users' },
  { resource: 'member', action: 'manage', description: 'Change roles, revoke access, and manage pending invitations' },
  { resource: 'team', action: 'manage', description: 'Create, edit, and delete teams' },
  { resource: 'project', action: 'manage', description: 'Create, edit, and delete projects. Attach repositories and teams' },
  // Integrations
  { resource: 'integration', action: 'manage', description: 'Connect/disconnect SCM providers' },
  { resource: 'webhook', action: 'manage', description: 'Create, edit, and delete outgoing webhooks' },
  { resource: 'schedule', action: 'manage', description: 'Create and manage recurring scan schedules' },
  // Analysis Policy
  { resource: 'policy', action: 'manage', description: 'Edit scan policies and quality gates' },
  { resource: 'scanner', action: 'manage', description: 'Configure scanner engines and rules' },
  { resource: 'ai_model', action: 'manage', description: 'Configure AI model chain and prompt presets' },
  // Intelligence
  { resource: 'knowledge', action: 'manage', description: 'Manage knowledge base sources and entries' },
  // System
  { resource: 'workspace', action: 'settings', description: 'Edit workspace name, billing, and global configuration' },
  { resource: 'audit', action: 'read', description: 'View audit logs and activity history' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  manager: [
    'dashboard:view', 'repository:view', 'repository:manage',
    'scan:view', 'scan:run',
    'finding:view', 'finding:triage', 'finding:override_ai',
    'report:view', 'report:export',
    'arena:manage',
    'member:invite',
    'team:manage', 'project:manage',
    'schedule:manage',
    'audit:read',
  ],
  reviewer: [
    'dashboard:view', 'repository:view',
    'scan:view', 'scan:run',
    'finding:view', 'finding:triage', 'finding:override_ai',
    'report:view', 'report:export',
  ],
  member: [
    'dashboard:view', 'repository:view',
    'scan:view',
    'finding:view',
    'report:view',
  ],
};

async function main() {
  console.log('Seeding database...');

  // 1. Create permissions
  const permissionRecords = await db
    .insert(schema.permissions)
    .values(PERMISSIONS.map((p) => ({ name: `${p.resource}:${p.action}`, resource: p.resource, action: p.action, description: p.description })))
    .onConflictDoNothing()
    .returning();
  console.log(`  Permissions: ${permissionRecords.length} created`);

  // Build permission lookup
  const allPerms = permissionRecords.length ? permissionRecords : await db.select().from(schema.permissions);
  const permMap = new Map(allPerms.map((p) => [p.name, p.id]));

  // 2. Create role_permissions
  const rolePermValues: { role: string; permissionId: string }[] = [];
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    for (const perm of perms) {
      const permId = permMap.get(perm);
      if (permId) rolePermValues.push({ role, permissionId: permId });
    }
  }
  await db.insert(schema.rolePermissions).values(rolePermValues).onConflictDoNothing();
  console.log(`  Role permissions: ${rolePermValues.length} mappings`);

  // 3. Create admin user
  const passwordHash = await hash('ChangeMe123!', 12);
  const [adminUser] = await db
    .insert(schema.users)
    .values({ email: 'admin@sast.local', passwordHash: passwordHash, name: 'Admin', emailVerifiedAt: new Date() })
    .onConflictDoNothing()
    .returning();

  if (adminUser) {
    console.log(`  Admin user: ${adminUser.email}`);

    // 4. Create personal workspace
    const [workspace] = await db
      .insert(schema.workspaces)
      .values({ name: 'Personal Workspace', slug: 'personal', type: 'personal', createdBy: adminUser.id, updatedBy: adminUser.id })
      .onConflictDoNothing()
      .returning();

    if (workspace) {
      // 5. Add admin as workspace owner
      await db.insert(schema.workspaceMembers).values({ workspaceId: workspace.id, userId: adminUser.id, role: 'owner' }).onConflictDoNothing();
      console.log(`  Workspace: ${workspace.name} (owner: ${adminUser.email})`);
    }
  } else {
    console.log('  Admin user already exists, skipping.');
  }

  console.log('Seed complete.');
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
