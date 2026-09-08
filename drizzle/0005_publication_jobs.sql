CREATE TABLE "editorial"."publication_jobs" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"snapshot" jsonb NOT NULL,
	"cache_state" text DEFAULT 'pending' NOT NULL,
	"notification_state" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "publication_job_states" CHECK ("editorial"."publication_jobs"."cache_state" IN ('pending','confirmed','superseded') AND "editorial"."publication_jobs"."notification_state" IN ('pending','sent','skipped','rejected'))
);
--> statement-breakpoint
ALTER TABLE "editorial"."publication_jobs" ADD CONSTRAINT "publication_jobs_event_id_publication_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "editorial"."publication_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "publication_jobs_next_attempt_at_cache_state_index" ON "editorial"."publication_jobs" USING btree ("next_attempt_at","cache_state");