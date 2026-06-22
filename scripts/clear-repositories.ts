/**
 * Clear repositories and source control data while preserving workspaces, users, and projects.
 *
 * Usage:
 *   npx tsx scripts/clear-repositories.ts
 *   npx tsx scripts/clear-repositories.ts --dry-run
 *   npx tsx scripts/clear-repositories.ts --include-projects
 */

import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

// Load env
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'root'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'sast_db'}`;

const dryRun = process.argv.includes('--dry-run');
const includeProjects = process.argv.includes('--include-projects');

async function main() {
  const db = drizzle(DATABASE_URL);

  console.log(dryRun ? '🔍 DRY RUN — no changes will be made' : '🗑️  Clearing repository data...');
  if (includeProjects) console.log('   ⚠️  --include-projects: will also delete projects and their API tokens');
  console.log('');

  // Tables to clear in order (respect FK constraints)
  const tables: Array<{ name: string; desc: string; condition?: string }> = [
    // Scan-related (depends on repositories)
    { name: 'ai_verifications', desc: 'AI verification results' },
    { name: 'finding_history', desc: 'Finding change history' },
    { name: 'comments', desc: 'Finding comments' },
    { name: 'findings', desc: 'Security findings' },
    { name: 'finding_groups', desc: 'Finding groups' },
    { name: 'scan_results', desc: 'Scan result files' },
    { name: 'quality_gate_results', desc: 'Quality gate evaluations' },
    { name: 'commit_statuses', desc: 'Commit status checks' },
    { name: 'scan_uploads', desc: 'CI upload records' },
    { name: 'scans', desc: 'Scan records' },
    // Source control imports (depends on source_control_repositories)
    { name: 'source_control_imports', desc: 'SCM imports & webhooks' },
    // Source control repositories (depends on source_controls)
    { name: 'source_control_repositories', desc: 'SCM discovered repos' },
    // Source controls (SCM connections)
    { name: 'source_controls', desc: 'SCM connections (Gitea, GitHub, etc.)' },
    // Repositories (internal repo records)
    { name: 'repositories', desc: 'Internal repositories' },
  ];

  // Optionally include projects and API tokens
  if (includeProjects) {
    tables.push(
      { name: 'project_api_tokens', desc: 'Project API tokens' },
      { name: 'projects', desc: 'Projects' },
    );
  }

  let totalDeleted = 0;

  for (const { name, desc, condition } of tables) {
    try {
      const whereClause = condition ? ` WHERE ${condition}` : '';
      const countResult = await db.execute(sql.raw(`SELECT COUNT(*)::int as count FROM "${name}"${whereClause}`));
      const count = (countResult.rows[0] as { count: number }).count;

      if (count === 0) {
        console.log(`  ✅ ${desc} (${name}) — already empty`);
        continue;
      }

      if (dryRun) {
        console.log(`  🔍 ${desc} (${name}) — ${count} rows would be deleted`);
      } else {
        await db.execute(sql.raw(`DELETE FROM "${name}"${whereClause}`));
        console.log(`  🗑️  ${desc} (${name}) — ${count} rows deleted`);
      }
      totalDeleted += count;
    } catch (err) {
      console.error(`  ❌ ${desc} (${name}) — error:`, (err as Error).message);
    }
  }

  console.log('');
  if (dryRun) {
    console.log(`🔍 Dry run complete. ${totalDeleted} rows would be deleted.`);
  } else {
    console.log(`✅ Done. ${totalDeleted} rows deleted.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
