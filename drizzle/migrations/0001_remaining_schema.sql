CREATE TABLE "ai_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid,
	"is_valid" boolean,
	"confidence" integer,
	"reasoning" text,
	"model_version" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid,
	"parent_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "finding_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"fingerprint" varchar(64) NOT NULL,
	"title" varchar(500),
	"first_seen_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now(),
	CONSTRAINT "finding_groups_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "finding_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid,
	"field" varchar(50) NOT NULL,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"group_id" uuid,
	"environment_id" uuid,
	"cwe_id" varchar(20),
	"severity" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"file_path" varchar(500),
	"line_number" integer,
	"code_snippet" text,
	"description" text,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"user_id" uuid,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"team_id" uuid,
	"role" varchar(20) NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"name" varchar(255),
	"slug" varchar(255),
	"platform" varchar(50),
	"language" varchar(50),
	"avatar_url" text,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "projects_workspace_id_slug_unique" UNIQUE("workspace_id","slug")
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"source_control_id" uuid,
	"name" varchar(255) NOT NULL,
	"url" varchar(500) NOT NULL,
	"default_branch" varchar(100) DEFAULT 'main',
	"auto_scan" boolean DEFAULT false,
	"webhook_id" varchar(255),
	"webhook_secret" varchar(255),
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "source_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"provider" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"credentials" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "scan_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"scanner" varchar(50) NOT NULL,
	"raw_output" jsonb,
	"summary" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid,
	"environment_id" uuid,
	"commit_sha" varchar(40),
	"branch" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid,
	"cron_expression" varchar(100) NOT NULL,
	"active" boolean DEFAULT true,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"filters" jsonb,
	"file_path" varchar(500),
	"file_size" integer,
	"format" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "storage_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100),
	"storage_provider" varchar(50) DEFAULT 'local' NOT NULL,
	"storage_key" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"user_id" uuid,
	"type" varchar(50) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"data" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cwe_id" varchar(20),
	"title" varchar(500) NOT NULL,
	"content" text,
	"severity" varchar(20),
	"remediation" text,
	"references" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"url" varchar(500) NOT NULL,
	"events" jsonb NOT NULL,
	"secret" varchar(255) NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "ai_verifications" ADD CONSTRAINT "ai_verifications_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_history" ADD CONSTRAINT "finding_history_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_group_id_finding_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."finding_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_source_control_id_source_controls_id_fk" FOREIGN KEY ("source_control_id") REFERENCES "public"."source_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_results" ADD CONSTRAINT "scan_results_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;