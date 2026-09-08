ALTER TABLE "editorial"."affiliate_links" ADD COLUMN "relationship" text DEFAULT 'commission' NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial"."affiliate_links" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial"."affiliate_links" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "editorial"."affiliate_links" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial"."sites" ADD COLUMN "affiliate_origins" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial"."affiliate_links" ADD CONSTRAINT "affiliate_links_approved_by_principals_id_fk" FOREIGN KEY ("approved_by") REFERENCES "editorial"."principals"("id") ON DELETE no action ON UPDATE no action;