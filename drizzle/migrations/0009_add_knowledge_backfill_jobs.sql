CREATE TABLE IF NOT EXISTS "knowledge_backfill_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid,
  "source_id" uuid,
  "source_type" varchar(50) NOT NULL,
  "status" varchar(20) DEFAULT 'queued' NOT NULL,
  "range_start" timestamp NOT NULL,
  "range_end" timestamp NOT NULL,
  "cursor_start" timestamp NOT NULL,
  "window_days" integer DEFAULT 30 NOT NULL,
  "imported_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "knowledge_backfill_jobs_source_id_knowledge_sources_id_fk"
    FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_backfill_source_status_idx"
  ON "knowledge_backfill_jobs" ("source_id", "status");
