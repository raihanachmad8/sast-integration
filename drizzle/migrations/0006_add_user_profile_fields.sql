-- Add profile fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" varchar(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" varchar(10);
