-- Migration: Create missing source control tables
-- These tables are defined in Drizzle schema but never created by migrations

CREATE TABLE IF NOT EXISTS "source_control_repositories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_control_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "full_name" varchar(500) NOT NULL,
  "url" varchar(500),
  "default_branch" varchar(100) DEFAULT 'main',
  "visibility" varchar(20) DEFAULT 'private',
  "synced_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "source_control_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "source_control_id" uuid NOT NULL,
  "source_control_repository_id" uuid NOT NULL,
  "repository_id" uuid,
  "webhook_external_id" varchar(255),
  "webhook_secret" varchar(255),
  "webhook_status" varchar(20) DEFAULT 'pending',
  "imported_by" uuid,
  "imported_at" timestamp,
  "uninstalled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign keys
DO $$ BEGIN
  ALTER TABLE "source_control_repositories" ADD CONSTRAINT "source_control_repositories_source_control_id_source_controls_id_fk"
    FOREIGN KEY ("source_control_id") REFERENCES "source_controls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "source_control_repositories" ADD CONSTRAINT "source_control_repositories_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "source_control_imports" ADD CONSTRAINT "source_control_imports_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "source_control_imports" ADD CONSTRAINT "source_control_imports_source_control_id_source_controls_id_fk"
    FOREIGN KEY ("source_control_id") REFERENCES "source_controls"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "source_control_imports" ADD CONSTRAINT "source_control_imports_source_control_repository_id_source_control_repositories_id_fk"
    FOREIGN KEY ("source_control_repository_id") REFERENCES "source_control_repositories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add unique index
DO $$ BEGIN
  CREATE UNIQUE INDEX "source_control_repositories_ctrl_name_idx" ON "source_control_repositories" ("source_control_id", "name");
EXCEPTION WHEN duplicate_table THEN null;
END $$;
