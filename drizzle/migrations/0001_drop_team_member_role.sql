-- Migration: Remove role column from team_members
-- Team membership no longer has its own role; workspace-level role applies.

ALTER TABLE "team_members" DROP COLUMN IF EXISTS "role";
