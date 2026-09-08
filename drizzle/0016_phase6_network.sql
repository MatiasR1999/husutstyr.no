CREATE TABLE "editorial"."network_anchor_claims" (
	"site_id" text NOT NULL,
	"anchor" text NOT NULL,
	"article_id" uuid NOT NULL,
	CONSTRAINT "network_anchor_claims_site_id_anchor_pk" PRIMARY KEY("site_id","anchor")
);
--> statement-breakpoint
CREATE TABLE "editorial"."network_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"article_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"block_index" integer NOT NULL,
	"anchor" text NOT NULL,
	"normalized_anchor" text NOT NULL,
	"peer_id" text NOT NULL,
	"destination" text NOT NULL,
	"topic_slug" text NOT NULL,
	"justification" text NOT NULL,
	"registry_version" integer NOT NULL,
	"approved_by" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_test" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "network_links_revision_id_normalized_anchor_unique" UNIQUE("revision_id","normalized_anchor")
);
--> statement-breakpoint
ALTER TABLE "editorial"."sites" ADD COLUMN "network_registry" jsonb DEFAULT '{"version":1,"sites":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial"."sites" ADD COLUMN "network_niche" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial"."sites" ADD COLUMN "network_origin" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "editorial"."network_anchor_claims" ADD CONSTRAINT "network_anchor_claims_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."network_anchor_claims" ADD CONSTRAINT "network_anchor_claims_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "editorial"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."network_links" ADD CONSTRAINT "network_links_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."network_links" ADD CONSTRAINT "network_links_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "editorial"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."network_links" ADD CONSTRAINT "network_links_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "editorial"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."network_links" ADD CONSTRAINT "network_links_approved_by_principals_id_fk" FOREIGN KEY ("approved_by") REFERENCES "editorial"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "network_links_site_id_article_id_revision_id_index" ON "editorial"."network_links" USING btree ("site_id","article_id","revision_id");