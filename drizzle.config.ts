import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'drizzle-kit';

const cwd = process.cwd();
const envPaths = [
  path.resolve(cwd, '.env.local'),
  path.resolve(cwd, '.env'),
];

if (typeof process.loadEnvFile === 'function') {
  for (const filePath of envPaths) {
    if (fs.existsSync(filePath)) {
      process.loadEnvFile(filePath);
      break;
    }
  }
}

const databaseUrl = process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? 'root'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'sast_db'}`;

export default defineConfig({
  schema: './drizzle/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});