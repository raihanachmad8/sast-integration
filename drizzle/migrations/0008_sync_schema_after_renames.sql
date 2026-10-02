CREATE TABLE "project_api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" varchar(20),
	"permissions" jsonb DEFAULT '["scans:upload"]'::jsonb NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by" uuid,
	CONSTRAINT "project_api_tokens_token_hash_unique" UNIQUE("token_hash")
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
ALTER TABLE "scan_policies" RENAME TO "scan_profiles";--> statement-breakpoint
ALTER TABLE "scans" DROP CONSTRAINT "scans_policy_id_scan_policies_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_policy_id_scan_policies_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "current_refresh_token_id" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "language" varchar(10);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lead" varchar(255);--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "connection_type" varchar(20) DEFAULT 'scm' NOT NULL;--> statement-breakpoint
ALTER TABLE "scan_results" ADD COLUMN "format" varchar(20);--> statement-breakpoint
ALTER TABLE "scan_results" ADD COLUMN "file_key" text;--> statement-breakpoint
ALTER TABLE "scan_results" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "scan_results" ADD COLUMN "parsed_summary" jsonb;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "origin" varchar(30) DEFAULT 'managed' NOT NULL;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "trigger_source" varchar(30);--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_tokens" ADD CONSTRAINT "project_api_tokens_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_project_api_token_id_project_api_tokens_id_fk" FOREIGN KEY ("project_api_token_id") REFERENCES "public"."project_api_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_uploads" ADD CONSTRAINT "scan_uploads_personal_access_token_id_personal_access_tokens_id_fk" FOREIGN KEY ("personal_access_token_id") REFERENCES "public"."personal_access_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_profile_id_scan_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."scan_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_profile_id_scan_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."scan_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_results" DROP COLUMN "raw_output";--> statement-breakpoint
ALTER TABLE "scan_results" DROP COLUMN "summary";--> statement-breakpoint
ALTER TABLE "scans" DROP COLUMN "policy_id";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "policy_id";--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_user_id_unique" UNIQUE("workspace_id","user_id");