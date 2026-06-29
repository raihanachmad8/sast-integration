-- Migration: Remove platform, language, avatar_url columns from projects
-- These fields are no longer used by the application layer.

ALTER TABLE "projects" DROP COLUMN IF EXISTS "platform";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "language";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "avatar_url";
