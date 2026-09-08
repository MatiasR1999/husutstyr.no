CREATE SCHEMA "editorial";
--> statement-breakpoint
CREATE TABLE "editorial"."affiliate_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"slug" text NOT NULL,
	"product_id" uuid,
	"destination" text NOT NULL,
	"disclosure" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "affiliate_links_site_id_slug_unique" UNIQUE("site_id","slug"),
	CONSTRAINT "affiliate_destination" CHECK ("editorial"."affiliate_links"."destination" ~ '^https?://')
);
--> statement-breakpoint
CREATE TABLE "editorial"."approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"approved_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_revision_id_content_hash_unique" UNIQUE("revision_id","content_hash")
);
--> statement-breakpoint
CREATE TABLE "editorial"."articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"locale" text NOT NULL,
	"category_id" uuid NOT NULL,
	"namespace" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_revision_id" uuid,
	"published_revision_id" uuid,
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"modified_at" timestamp with time zone,
	CONSTRAINT "articles_site_id_locale_namespace_slug_unique" UNIQUE("site_id","locale","namespace","slug"),
	CONSTRAINT "articles_id_site_id_unique" UNIQUE("id","site_id"),
	CONSTRAINT "article_slug_shape" CHECK ("editorial"."articles"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("editorial"."articles"."slug") <= 100),
	CONSTRAINT "article_kind" CHECK ("editorial"."articles"."kind" IN ('article','news','review')),
	CONSTRAINT "article_status" CHECK ("editorial"."articles"."status" IN ('draft','in_review','published')),
	CONSTRAINT "article_publication_dates" CHECK ("editorial"."articles"."published_revision_id" IS NULL OR ("editorial"."articles"."status" = 'published' AND "editorial"."articles"."published_at" IS NOT NULL AND "editorial"."articles"."modified_at" >= "editorial"."articles"."published_at"))
);
--> statement-breakpoint
CREATE TABLE "editorial"."assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"provider" text NOT NULL,
	"object_key" text NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"rights" text NOT NULL,
	"width" integer,
	"height" integer,
	CONSTRAINT "assets_site_id_object_key_unique" UNIQUE("site_id","object_key"),
	CONSTRAINT "asset_dimensions" CHECK (("editorial"."assets"."width" IS NULL AND "editorial"."assets"."height" IS NULL) OR ("editorial"."assets"."width" > 0 AND "editorial"."assets"."height" > 0))
);
--> statement-breakpoint
CREATE TABLE "editorial"."authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"bio" text NOT NULL,
	"image" jsonb,
	"expertise" text[] NOT NULL,
	"same_as" text[] NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	CONSTRAINT "authors_site_id_slug_unique" UNIQUE("site_id","slug"),
	CONSTRAINT "authors_id_site_id_unique" UNIQUE("id","site_id")
);
--> statement-breakpoint
CREATE TABLE "editorial"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"locale" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"introduction" text NOT NULL,
	"seo" jsonb NOT NULL,
	CONSTRAINT "categories_site_id_locale_slug_unique" UNIQUE("site_id","locale","slug"),
	CONSTRAINT "categories_id_site_id_locale_unique" UNIQUE("id","site_id","locale"),
	CONSTRAINT "category_slug_shape" CHECK ("editorial"."categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("editorial"."categories"."slug") <= 100)
);
--> statement-breakpoint
CREATE TABLE "editorial"."locales" (
	"site_id" text NOT NULL,
	"locale" text NOT NULL,
	CONSTRAINT "locales_site_id_locale_pk" PRIMARY KEY("site_id","locale")
);
--> statement-breakpoint
CREATE TABLE "editorial"."login_attempts" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"nonce" text NOT NULL,
	"verifier" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial"."original_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"method" text NOT NULL,
	"responsible_author_id" uuid NOT NULL,
	"performed_at" timestamp with time zone NOT NULL,
	"evidence" jsonb NOT NULL,
	CONSTRAINT "research_has_evidence" CHECK (length(trim("editorial"."original_research"."method")) >= 30 AND jsonb_typeof("editorial"."original_research"."evidence") = 'array' AND jsonb_array_length("editorial"."original_research"."evidence") > 0)
);
--> statement-breakpoint
CREATE TABLE "editorial"."prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	CONSTRAINT "price_valid" CHECK ("editorial"."prices"."amount" >= 0 AND "editorial"."prices"."currency" ~ '^[A-Z]{3}$' AND "editorial"."prices"."valid_until" > "editorial"."prices"."checked_at")
);
--> statement-breakpoint
CREATE TABLE "editorial"."principals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"role" text NOT NULL,
	"author_id" uuid,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	CONSTRAINT "principals_site_id_issuer_subject_unique" UNIQUE("site_id","issuer","subject"),
	CONSTRAINT "principal_role" CHECK ("editorial"."principals"."role" IN ('writer','editor','viewer'))
);
--> statement-breakpoint
CREATE TABLE "editorial"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"name" text NOT NULL,
	"manufacturer" text,
	"identifier" text,
	"owned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial"."publication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"revision_id" uuid,
	"actor_id" uuid NOT NULL,
	"event" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "publication_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "editorial"."redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text,
	"status" integer NOT NULL,
	CONSTRAINT "redirects_site_id_from_path_unique" UNIQUE("site_id","from_path"),
	CONSTRAINT "redirect_valid" CHECK (("editorial"."redirects"."status" = 301 AND "editorial"."redirects"."to_path" IS NOT NULL AND "editorial"."redirects"."to_path" <> "editorial"."redirects"."from_path") OR ("editorial"."redirects"."status" = 410 AND "editorial"."redirects"."to_path" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "editorial"."revision_topics" (
	"revision_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	CONSTRAINT "revision_topics_revision_id_topic_id_pk" PRIMARY KEY("revision_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "editorial"."revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"author_snapshot" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revisions_article_id_id_unique" UNIQUE("article_id","id"),
	CONSTRAINT "revision_json_object" CHECK (jsonb_typeof("editorial"."revisions"."payload") = 'object')
);
--> statement-breakpoint
CREATE TABLE "editorial"."sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"principal_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial"."sites" (
	"id" text PRIMARY KEY NOT NULL,
	"reserved_routes" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial"."sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial"."topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"locale" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "topics_site_id_locale_slug_unique" UNIQUE("site_id","locale","slug")
);
--> statement-breakpoint
ALTER TABLE "editorial"."affiliate_links" ADD CONSTRAINT "affiliate_links_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."affiliate_links" ADD CONSTRAINT "affiliate_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "editorial"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."approvals" ADD CONSTRAINT "approvals_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "editorial"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."approvals" ADD CONSTRAINT "approvals_approved_by_principals_id_fk" FOREIGN KEY ("approved_by") REFERENCES "editorial"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."articles" ADD CONSTRAINT "articles_category_id_site_id_locale_categories_id_site_id_locale_fk" FOREIGN KEY ("category_id","site_id","locale") REFERENCES "editorial"."categories"("id","site_id","locale") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."assets" ADD CONSTRAINT "assets_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."authors" ADD CONSTRAINT "authors_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."categories" ADD CONSTRAINT "categories_site_id_locale_locales_site_id_locale_fk" FOREIGN KEY ("site_id","locale") REFERENCES "editorial"."locales"("site_id","locale") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."locales" ADD CONSTRAINT "locales_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."original_research" ADD CONSTRAINT "original_research_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "editorial"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."original_research" ADD CONSTRAINT "original_research_responsible_author_id_authors_id_fk" FOREIGN KEY ("responsible_author_id") REFERENCES "editorial"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."prices" ADD CONSTRAINT "prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "editorial"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."principals" ADD CONSTRAINT "principals_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."principals" ADD CONSTRAINT "principals_author_id_site_id_authors_id_site_id_fk" FOREIGN KEY ("author_id","site_id") REFERENCES "editorial"."authors"("id","site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."products" ADD CONSTRAINT "products_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."publication_events" ADD CONSTRAINT "publication_events_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "editorial"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."publication_events" ADD CONSTRAINT "publication_events_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "editorial"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."publication_events" ADD CONSTRAINT "publication_events_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "editorial"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."redirects" ADD CONSTRAINT "redirects_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "editorial"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."revision_topics" ADD CONSTRAINT "revision_topics_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "editorial"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."revision_topics" ADD CONSTRAINT "revision_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "editorial"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."revisions" ADD CONSTRAINT "revisions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "editorial"."articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."revisions" ADD CONSTRAINT "revisions_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "editorial"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."revisions" ADD CONSTRAINT "revisions_created_by_principals_id_fk" FOREIGN KEY ("created_by") REFERENCES "editorial"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."sessions" ADD CONSTRAINT "sessions_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "editorial"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."sources" ADD CONSTRAINT "sources_revision_id_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "editorial"."revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial"."topics" ADD CONSTRAINT "topics_site_id_locale_locales_site_id_locale_fk" FOREIGN KEY ("site_id","locale") REFERENCES "editorial"."locales"("site_id","locale") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revisions_article_id_created_at_index" ON "editorial"."revisions" USING btree ("article_id","created_at");