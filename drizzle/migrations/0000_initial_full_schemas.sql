CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"data" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "personal_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"token" varchar(64) NOT NULL,
	"abilities" jsonb,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by" uuid,
	CONSTRAINT "personal_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"token" varchar(255) NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "workspace_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ai_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid,
	"group_id" uuid,
	"model_id" uuid,
	"verdict" varchar(20) NOT NULL,
	"confidence" numeric(3, 2),
	"explanation" text,
	"data_flow" text,
	"taint_source" text,
	"match_detail" text,
	"likely_cwe" jsonb,
	"fix_suggestion" text,
	"latency_ms" integer,
	"raw_response" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_group_scans" (
	"scan_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"is_new" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fgs_scan_group_pk" PRIMARY KEY("scan_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "finding_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"repository_id" uuid,
	"fingerprint" varchar(64) NOT NULL,
	"title" varchar(500),
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"field" varchar(50) NOT NULL,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"group_id" uuid,
	"cwe_id" varchar(255),
	"severity" varchar(20) NOT NULL,
	"file_path" varchar(500),
	"line_number" integer,
	"code_snippet" text,
	"description" text,
	"rule" varchar(500),
	"scanner" varchar(50),
	"message" text,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"last_activity" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"current_refresh_token_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"username" varchar(50),
	"bio" text,
	"timezone" varchar(50),
	"language" varchar(10),
	"two_factor_secret" text,
	"two_factor_confirmed_at" timestamp,
	"email_verified_at" timestamp,
	"current_workspace_id" uuid,
	"remember_token" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"avatar_url" text,
	"description" text,
	"features" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"token_sha256" varchar(64) NOT NULL,
	"token_prefix" varchar(20),
	"permissions" jsonb DEFAULT '["scans:upload"]'::jsonb NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by" uuid,
	CONSTRAINT "project_api_tokens_token_sha256_unique" UNIQUE("token_sha256")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"platform" varchar(50),
	"language" varchar(50),
	"avatar_url" text,
	"description" text,
	"lead" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"external_id" varchar(255),
	"provider" varchar(20),
	"name" varchar(255) NOT NULL,
	"url" varchar(500) NOT NULL,
	"default_branch" varchar(100) DEFAULT 'main',
	"connection_type" text[] DEFAULT '{"scm"}' NOT NULL,
	"import_mode" varchar(20) DEFAULT 'manual',
	"auto_scan" boolean DEFAULT false,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "source_control_imports" (
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
--> statement-breakpoint
CREATE TABLE "source_control_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_control_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"external_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"full_name" varchar(500) NOT NULL,
	"url" varchar(500),
	"default_branch" varchar(100) DEFAULT 'main',
	"visibility" varchar(20) DEFAULT 'private',
	"synced_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "source_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"credentials" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"type" varchar(50) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"data" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_backfill_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"source_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"range_start" timestamp NOT NULL,
	"range_end" timestamp NOT NULL,
	"cursor_start" timestamp NOT NULL,
	"window_days" integer DEFAULT 30 NOT NULL,
	"max_duration_ms" integer DEFAULT 3600000,
	"max_retries" integer DEFAULT 10,
	"retry_count" integer DEFAULT 0,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"cwe_id" varchar(20),
	"title" varchar(500) NOT NULL,
	"content" text,
	"severity" varchar(20),
	"remediation" text,
	"tags" jsonb,
	"muted" boolean DEFAULT false,
	"used_by_ai_count" integer DEFAULT 0,
	"references" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"url" varchar(500),
	"status" varchar(20) DEFAULT 'disconnected',
	"entry_count" integer DEFAULT 0,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"base_url" varchar(500) NOT NULL,
	"api_key_encrypted" text,
	"role" varchar(20) DEFAULT 'fallback' NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"prompt_preset" varchar(20) DEFAULT 'strict' NOT NULL,
	"custom_system_prompt" text,
	"status" varchar(20) DEFAULT 'unreachable',
	"last_tested_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"response_status" integer,
	"request_body" jsonb,
	"response_body" text,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255),
	"url" varchar(500) NOT NULL,
	"events" jsonb NOT NULL,
	"secret" varchar(255) NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "commit_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"commit_sha" varchar(40) NOT NULL,
	"status" varchar(20) NOT NULL,
	"context" varchar(100) NOT NULL,
	"description" text,
	"target_url" text,
	"provider" varchar(20) NOT NULL,
	"external_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_gate_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"gate_id" uuid,
	"status" varchar(20) NOT NULL,
	"blocking_findings" integer DEFAULT 0,
	"pending_findings" integer DEFAULT 0,
	"new_findings" integer DEFAULT 0,
	"fixed_findings" integer DEFAULT 0,
	"persistent_findings" integer DEFAULT 0,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quality_gate_results_scan_id_unique" UNIQUE("scan_id")
);
--> statement-breakpoint
CREATE TABLE "quality_gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"threshold" varchar(20) DEFAULT 'high' NOT NULL,
	"fail_on_critical" boolean DEFAULT true,
	"fail_on_high_tp" boolean DEFAULT true,
	"fail_on_high" boolean DEFAULT true,
	"fail_on_medium" boolean DEFAULT false,
	"fail_on_low" boolean DEFAULT false,
	"fail_on_pending" boolean DEFAULT true,
	"fail_on_tp" boolean DEFAULT false,
	"warn_on_pending" boolean DEFAULT true,
	"require_human_ack" boolean DEFAULT false,
	"pending_behavior" varchar(20) DEFAULT 'warn',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"scanner" varchar(50) NOT NULL,
	"format" varchar(20),
	"file_key" text,
	"file_size" integer,
	"parsed_summary" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scan_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid,
	"project_id" uuid,
	"scan_id" uuid,
	"branch" varchar(100),
	"commit_sha" varchar(40),
	"uploaded_by" uuid,
	"source" varchar(30),
	"metadata" jsonb,
	"project_api_token_id" uuid,
	"personal_access_token_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid,
	"commit_sha" varchar(40),
	"branch" varchar(100),
	"origin" varchar(30) DEFAULT 'managed' NOT NULL,
	"trigger_source" varchar(30),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"progress_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"pr_number" integer,
	"base_branch" varchar(100),
	"head_branch" varchar(100),
	"pr_author" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"repository_id" uuid,
	"branch" varchar(100),
	"timezone" varchar(50) DEFAULT 'UTC',
	"cron_expression" varchar(100) NOT NULL,
	"active" boolean DEFAULT true,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'generated' NOT NULL,
	"filters" jsonb,
	"file_path" varchar(500),
	"file_size" integer,
	"format" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "storage_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100),
	"storage_provider" varchar(50) DEFAULT 'local' NOT NULL,
	"storage_key" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_verifications" ADD CONSTRAINT "ai_verifications_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_verifications" ADD CONSTRAINT "ai_verifications_group_id_finding_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."finding_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_verifications" ADD CONSTRAINT "ai_verifications_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_group_scans" ADD CONSTRAINT "finding_group_scans_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_group_scans" ADD CONSTRAINT "finding_group_scans_group_id_finding_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."finding_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_groups" ADD CONSTRAINT "finding_groups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_groups" ADD CONSTRAINT "finding_groups_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_history" ADD CONSTRAINT "finding_history_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_history" ADD CONSTRAINT "finding_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_group_id_finding_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."finding_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_control_imports" ADD CONSTRAINT "source_control_imports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_control_imports" ADD CONSTRAINT "source_control_imports_source_control_id_source_controls_id_fk" FOREIGN KEY ("source_control_id") REFERENCES "public"."source_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_control_imports" ADD CONSTRAINT "source_control_imports_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_control_imports" ADD CONSTRAINT "source_control_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_control_imports" ADD CONSTRAINT "sci_srcr_fk" FOREIGN KEY ("source_control_repository_id") REFERENCES "public"."source_control_repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_control_repositories" ADD CONSTRAINT "source_control_repositories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_control_repositories" ADD CONSTRAINT "scr_sc_fk" FOREIGN KEY ("source_control_id") REFERENCES "public"."source_controls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_controls" ADD CONSTRAINT "source_controls_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_controls" ADD CONSTRAINT "source_controls_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_backfill_jobs" ADD CONSTRAINT "knowledge_backfill_jobs_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commit_statuses" ADD CONSTRAINT "commit_statuses_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commit_statuses" ADD CONSTRAINT "commit_statuses_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gate_results" ADD CONSTRAINT "quality_gate_results_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gate_results" ADD CONSTRAINT "quality_gate_results_gate_id_quality_gates_id_fk" FOREIGN KEY ("gate_id") REFERENCES "public"."quality_gates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gates" ADD CONSTRAINT "quality_gates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_results" ADD CONSTRAINT "scan_results_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_project_api_token_id_project_api_tokens_id_fk" FOREIGN KEY ("project_api_token_id") REFERENCES "public"."project_api_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_uploads" ADD CONSTRAINT "su_pat_fk" FOREIGN KEY ("personal_access_token_id") REFERENCES "public"."personal_access_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_files" ADD CONSTRAINT "storage_files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_files" ADD CONSTRAINT "storage_files_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_verifications_finding_id_idx" ON "ai_verifications" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "ai_verifications_group_id_idx" ON "ai_verifications" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "finding_groups_repo_fingerprint_idx" ON "finding_groups" USING btree ("repository_id","fingerprint");--> statement-breakpoint
CREATE INDEX "finding_groups_status_idx" ON "finding_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "finding_groups_project_id_idx" ON "finding_groups" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "findings_scan_id_idx" ON "findings" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "findings_group_id_idx" ON "findings" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "findings_severity_idx" ON "findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "findings_status_idx" ON "findings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "findings_assigned_to_idx" ON "findings" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "findings_scanner_idx" ON "findings" USING btree ("scanner");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_user_idx" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "teams_workspace_id_idx" ON "teams" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "project_members_project_id_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_idx" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_teams_project_id_idx" ON "project_teams" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_teams_project_team_idx" ON "project_teams" USING btree ("project_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_slug_idx" ON "projects" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repositories_workspace_name_idx" ON "repositories" USING btree ("workspace_id","name") WHERE "repositories"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "repositories_project_id_idx" ON "repositories" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_control_repositories_ctrl_name_idx" ON "source_control_repositories" USING btree ("source_control_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "source_control_repositories_ctrl_extid_idx" ON "source_control_repositories" USING btree ("source_control_id","external_id");--> statement-breakpoint
CREATE INDEX "source_controls_workspace_id_idx" ON "source_controls" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "activity_logs_workspace_id_idx" ON "activity_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_id_idx" ON "audit_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "knowledge_backfill_source_status_idx" ON "knowledge_backfill_jobs" USING btree ("source_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_entries_source_cwe_idx" ON "knowledge_entries" USING btree ("source_id","cwe_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_sources_global_type_idx" ON "knowledge_sources" USING btree ("type") WHERE "knowledge_sources"."workspace_id" IS NULL;--> statement-breakpoint
CREATE INDEX "ai_models_workspace_id_idx" ON "ai_models" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhooks_workspace_id_idx" ON "webhooks" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quality_gates_workspace_id_idx" ON "quality_gates" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "scans_repository_id_idx" ON "scans" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "scans_status_idx" ON "scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scans_created_at_idx" ON "scans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scans_created_by_idx" ON "scans" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "scans_branch_idx" ON "scans" USING btree ("branch");--> statement-breakpoint
CREATE INDEX "scans_head_branch_idx" ON "scans" USING btree ("head_branch");