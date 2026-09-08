CREATE TABLE "editorial"."page_metadata_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"locale" text NOT NULL,
	"path" text NOT NULL,
	"page" integer NOT NULL,
	"seo" jsonb NOT NULL,
	"is_test" boolean NOT NULL,
	"approved_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editorial"."articles" DROP CONSTRAINT "article_kind";--> statement-breakpoint
ALTER TABLE "editorial"."revisions" ADD COLUMN "review_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "editorial"."page_metadata_editions" ADD CONSTRAINT "page_metadata_editions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."page_metadata_editions" ADD CONSTRAINT "page_metadata_editions_approved_by_principals_id_fk" FOREIGN KEY ("approved_by") REFERENCES "editorial"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_metadata_editions_site_id_path_page_created_at_index" ON "editorial"."page_metadata_editions" USING btree ("site_id","path","page","created_at");--> statement-breakpoint
ALTER TABLE "editorial"."articles" ADD CONSTRAINT "article_kind" CHECK ("editorial"."articles"."kind" IN ('article','news','review','page'));