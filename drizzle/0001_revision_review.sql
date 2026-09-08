CREATE TABLE "editorial"."review_details" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"rating" numeric,
	"paid" boolean NOT NULL,
	"method" text NOT NULL,
	CONSTRAINT "review_valid" CHECK (("editorial"."review_details"."rating" IS NULL OR "editorial"."review_details"."rating" BETWEEN 1 AND 5) AND length(trim("editorial"."review_details"."method")) >= 30)
);
--> statement-breakpoint
CREATE TABLE "editorial"."review_requests" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"submitted_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editorial"."review_details" ADD CONSTRAINT "review_details_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "editorial"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."review_details" ADD CONSTRAINT "review_details_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "editorial"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."review_requests" ADD CONSTRAINT "review_requests_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "editorial"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."review_requests" ADD CONSTRAINT "review_requests_submitted_by_principals_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "editorial"."principals"("id") ON DELETE no action ON UPDATE no action;