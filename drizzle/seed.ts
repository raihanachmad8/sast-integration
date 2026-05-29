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
  { resource: 'workspace', action: 'manage', description: 'Manage workspace settings' },
  { resource: 'members', action: 'invite', description: 'Invite workspace members' },
  { resource: 'members', action: 'manage', description: 'Manage member roles and access' },
  { resource: 'projects', action: 'create', description: 'Create projects' },
  { resource: 'projects', action: 'manage', description: 'Edit and delete projects' },
  { resource: 'scans', action: 'create', description: 'Trigger scans' },
  { resource: 'scans', action: 'read', description: 'View scan results' },
  { resource: 'findings', action: 'read', description: 'View findings' },
  { resource: 'findings', action: 'triage', description: 'Accept, dismiss, or reassign findings' },
  { resource: 'findings', action: 'override_ai', description: 'Override AI verdict manually' },
  { resource: 'reports', action: 'export', description: 'Generate and download reports' },
  { resource: 'integrations', action: 'manage', description: 'Manage SCM, webhooks, AI models' },
  { resource: 'policies', action: 'manage', description: 'Manage scan policies and quality gates' },
  { resource: 'knowledge', action: 'manage', description: 'Manage knowledge base entries' },
  { resource: 'audit', action: 'read', description: 'View audit logs' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: PERMISSIONS.map((p) => `${p.resource}.${p.action}`),
  manager: [
    'members.invite', 'projects.create', 'projects.manage',
    'scans.create', 'scans.read', 'findings.read', 'findings.triage',
    'findings.override_ai', 'reports.export',
  ],
  reviewer: [
    'scans.create', 'scans.read', 'findings.read', 'findings.triage',
    'findings.override_ai', 'reports.export',
  ],
  member: ['scans.read', 'findings.read'],
};

async function main() {
  console.log('Seeding database...');

  // 1. Create permissions
  const permissionRecords = await db
    .insert(schema.permissions)
    .values(PERMISSIONS.map((p) => ({ name: `${p.resource}.${p.action}`, resource: p.resource, action: p.action, description: p.description })))
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
