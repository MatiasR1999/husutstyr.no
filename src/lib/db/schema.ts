import { sql } from 'drizzle-orm';
import { pgSchema, text, uuid, timestamp, boolean, integer, jsonb, unique, primaryKey, check, index, foreignKey, numeric } from 'drizzle-orm/pg-core';

export const editorial = pgSchema('editorial');
const id = () => uuid('id').primaryKey().defaultRandom();
const created = () => timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();
export const sites = editorial.table('sites', {
  networkRegistry: jsonb('network_registry').$type<import('../site-types').NetworkRegistry>().notNull().default(sql`'{"version":1,"sites":[]}'::jsonb`), networkNiche:text('network_niche').notNull().default(''), networkOrigin:text('network_origin').notNull().default(''),
  id: text('id').primaryKey(), reservedRoutes: text('reserved_routes').array().notNull(), trustRoutes: text('trust_routes').array().notNull().default(sql`ARRAY[]::text[]`), affiliateOrigins: text('affiliate_origins').array().notNull().default(sql`ARRAY[]::text[]`),
});
export const locales = editorial.table('locales', {
  siteId: text('site_id').notNull().references(() => sites.id), locale: text('locale').notNull(),
}, t => [primaryKey({ columns: [t.siteId, t.locale] })]);
export const authors = editorial.table('authors', {
  id: id(), siteId: text('site_id').notNull().references(() => sites.id), slug: text('slug').notNull(), name: text('name').notNull(),
  bio: text('bio').notNull(), image: jsonb('image').$type<{ url: string; alt: string; rights: string; width:number; height:number } | null>(),
  expertise: text('expertise').array().notNull(), sameAs: text('same_as').array().notNull(), isTest: boolean('is_test').notNull().default(false),
}, t => [unique().on(t.siteId, t.slug), unique().on(t.id, t.siteId)]);
export const categories = editorial.table('categories', {
  id: id(), siteId: text('site_id').notNull(), locale: text('locale').notNull(), slug: text('slug').notNull(),
  name: text('name').notNull(), introduction: text('introduction').notNull(), seo: jsonb('seo').$type<{ title: string; description: string }>().notNull(),
}, t => [unique().on(t.siteId, t.locale, t.slug), unique().on(t.id, t.siteId, t.locale),
  foreignKey({ columns: [t.siteId, t.locale], foreignColumns: [locales.siteId, locales.locale] }),
  check('category_slug_shape', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(${t.slug}) <= 100`)]);
export const principals = editorial.table('principals', {
  id: id(), siteId: text('site_id').notNull().references(() => sites.id), issuer: text('issuer').notNull(), subject: text('subject').notNull(),
  role: text('role', { enum: ['writer', 'editor', 'viewer'] }).notNull(), authorId: uuid('author_id'), enabled: boolean('enabled').notNull().default(true), isTest: boolean('is_test').notNull().default(false),
}, t => [unique().on(t.siteId, t.issuer, t.subject), foreignKey({ columns: [t.authorId, t.siteId], foreignColumns: [authors.id, authors.siteId] }), check('principal_role', sql`${t.role} IN ('writer','editor','viewer')`)]);
export const sessions = editorial.table('sessions', {
  tokenHash: text('token_hash').primaryKey(), principalId: uuid('principal_id').notNull().references(() => principals.id),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(), createdAt: created(),
});
export const loginAttempts = editorial.table('login_attempts', {
  tokenHash: text('token_hash').primaryKey(), state: text('state').notNull(), nonce: text('nonce').notNull(), verifier: text('verifier').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
});
export const articles = editorial.table('articles', {
  id: id(), siteId: text('site_id').notNull(), locale: text('locale').notNull(), categoryId: uuid('category_id').notNull(), namespace: text('namespace').notNull(), slug: text('slug').notNull(),
  kind: text('kind', { enum: ['article', 'news', 'review', 'page'] }).notNull(), status: text('status', { enum: ['draft', 'in_review', 'published'] }).notNull().default('draft'),
  currentRevisionId: uuid('current_revision_id'), publishedRevisionId: uuid('published_revision_id'), isTest: boolean('is_test').notNull().default(false), createdAt: created(),
  publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }), modifiedAt: timestamp('modified_at', { withTimezone: true, mode: 'string' }),
}, t => [unique().on(t.siteId, t.locale, t.namespace, t.slug), unique().on(t.id, t.siteId),
  foreignKey({ columns: [t.categoryId, t.siteId, t.locale], foreignColumns: [categories.id, categories.siteId, categories.locale] }),
  check('article_slug_shape', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(${t.slug}) <= 100`),
  check('article_kind', sql`${t.kind} IN ('article','news','review','page')`), check('article_status', sql`${t.status} IN ('draft','in_review','published')`),
  check('article_publication_dates', sql`${t.publishedRevisionId} IS NULL OR (${t.status} = 'published' AND ${t.publishedAt} IS NOT NULL AND ${t.modifiedAt} >= ${t.publishedAt})`)]);
export const revisions = editorial.table('revisions', {
  id: id(), articleId: uuid('article_id').notNull().references(() => articles.id), authorId: uuid('author_id').notNull().references(() => authors.id),
  createdBy: uuid('created_by').notNull().references(() => principals.id), payload: jsonb('payload').$type<unknown>().notNull(), authorSnapshot: jsonb('author_snapshot').$type<unknown>().notNull(),
  reviewSnapshot: jsonb('review_snapshot').$type<unknown>(), contentHash: text('content_hash').notNull(), createdAt: created(),
}, t => [unique().on(t.articleId, t.id), index().on(t.articleId, t.createdAt), check('revision_json_object', sql`jsonb_typeof(${t.payload}) = 'object'`)]);
export const approvals = editorial.table('approvals', {
  id: id(), revisionId: uuid('revision_id').notNull().references(() => revisions.id), contentHash: text('content_hash').notNull(),
  approvedBy: uuid('approved_by').notNull().references(() => principals.id), approvedAt: created(),
}, t => [unique().on(t.revisionId, t.contentHash)]);
export const assets = editorial.table('assets', {
  id: id(), siteId: text('site_id').notNull().references(() => sites.id), provider: text('provider').notNull(), objectKey: text('object_key').notNull(),
  url: text('url').notNull(), alt: text('alt').notNull(), rights: text('rights').notNull(), width: integer('width'), height: integer('height'),
}, t => [unique().on(t.siteId, t.objectKey), check('asset_dimensions', sql`(${t.width} IS NULL AND ${t.height} IS NULL) OR (${t.width} > 0 AND ${t.height} > 0)`)]);
export const sources = editorial.table('sources', {
  id: id(), revisionId: uuid('revision_id').notNull().references(() => revisions.id), url: text('url').notNull(), title: text('title').notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true, mode: 'string' }).notNull(),
});
export const originalResearch = editorial.table('original_research', {
  id: id(), revisionId: uuid('revision_id').notNull().references(() => revisions.id), method: text('method').notNull(),
  responsibleAuthorId: uuid('responsible_author_id').notNull().references(() => authors.id), performedAt: timestamp('performed_at', { withTimezone: true, mode: 'string' }).notNull(),
  evidence: jsonb('evidence').$type<readonly { assetId?: string; url?: string; description: string }[]>().notNull(),
}, t => [check('research_has_evidence', sql`length(trim(${t.method})) >= 30 AND jsonb_typeof(${t.evidence}) = 'array' AND jsonb_array_length(${t.evidence}) > 0`)]);
export const topics = editorial.table('topics', {
  id: id(), siteId: text('site_id').notNull(), locale: text('locale').notNull(), slug: text('slug').notNull(), name: text('name').notNull(),
}, t => [unique().on(t.siteId, t.locale, t.slug), foreignKey({ columns: [t.siteId, t.locale], foreignColumns: [locales.siteId, locales.locale] })]);
export const revisionTopics = editorial.table('revision_topics', {
  revisionId: uuid('revision_id').notNull().references(() => revisions.id), topicId: uuid('topic_id').notNull().references(() => topics.id),
}, t => [primaryKey({ columns: [t.revisionId, t.topicId] })]);
export const products = editorial.table('products', {
  id: id(), siteId: text('site_id').notNull().references(() => sites.id), name: text('name').notNull(), manufacturer: text('manufacturer'), identifier: text('identifier'), owned: boolean('owned').notNull().default(false),
});
export const prices = editorial.table('prices', {
  id: id(), productId: uuid('product_id').notNull().references(() => products.id), amount: numeric('amount', { precision: 14, scale: 2 }).notNull(), currency: text('currency').notNull(),
  source: text('source').notNull(), checkedAt: timestamp('checked_at', { withTimezone: true, mode: 'string' }).notNull(), validUntil: timestamp('valid_until', { withTimezone: true, mode: 'string' }).notNull(),
}, t => [check('price_valid', sql`${t.amount} >= 0 AND ${t.currency} ~ '^[A-Z]{3}$' AND ${t.validUntil} > ${t.checkedAt}`)]);
export const affiliateLinks = editorial.table('affiliate_links', {
  id: id(), siteId: text('site_id').notNull().references(() => sites.id), slug: text('slug').notNull(), productId: uuid('product_id').references(() => products.id), destination: text('destination').notNull(), disclosure: text('disclosure').notNull(), enabled: boolean('enabled').notNull().default(false),
  relationship: text('relationship', {enum:['commission','owned']}).notNull().default('commission'), isTest: boolean('is_test').notNull().default(false), approvedBy: uuid('approved_by').references(()=>principals.id), createdAt: created(),
}, t => [unique().on(t.siteId, t.slug), check('affiliate_destination', sql`${t.destination} ~ '^https?://'`)]);
export const redirects = editorial.table('redirects', {
  id: id(), siteId: text('site_id').notNull().references(() => sites.id), fromPath: text('from_path').notNull(), toPath: text('to_path'), status: integer('status').notNull(), isTest: boolean('is_test').notNull().default(false),
}, t => [unique().on(t.siteId, t.fromPath), check('redirect_valid', sql`(${t.status} = 301 AND ${t.toPath} IS NOT NULL AND ${t.toPath} <> ${t.fromPath}) OR (${t.status} = 410 AND ${t.toPath} IS NULL)`)]);
export const publicationEvents = editorial.table('publication_events', {
  id: id(), articleId: uuid('article_id').notNull().references(() => articles.id), revisionId: uuid('revision_id').references(() => revisions.id), actorId: uuid('actor_id').notNull().references(() => principals.id),
  event: text('event').notNull(), idempotencyKey: text('idempotency_key').notNull().unique(), createdAt: created(), processedAt: timestamp('processed_at', { withTimezone: true, mode: 'string' }),
});
export const reviewRequests = editorial.table('review_requests', {
  revisionId: uuid('revision_id').primaryKey().references(() => revisions.id), submittedBy: uuid('submitted_by').notNull().references(() => principals.id), submittedAt: created(),
});
export const reviewDetails = editorial.table('review_details', {
  revisionId: uuid('revision_id').primaryKey().references(() => revisions.id), productId: uuid('product_id').notNull().references(() => products.id), rating: numeric('rating'), paid: boolean('paid').notNull(), method: text('method').notNull(),
}, t => [check('review_valid', sql`(${t.rating} IS NULL OR ${t.rating} BETWEEN 1 AND 5) AND length(trim(${t.method})) >= 30`)]);
export const publicationJobs = editorial.table('publication_jobs', {
  eventId: uuid('event_id').primaryKey().references(() => publicationEvents.id),
  snapshot: jsonb('snapshot').$type<unknown>().notNull(),
  cacheState: text('cache_state').notNull().default('pending'), notificationState: text('notification_state').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0), nextAttemptAt: timestamp('next_attempt_at', {withTimezone:true,mode:'string'}).notNull().defaultNow(),
  leaseToken: uuid('lease_token'), leaseUntil: timestamp('lease_until',{withTimezone:true,mode:'string'}), lastError: text('last_error'),
},t=>[check('publication_job_states',sql`${t.cacheState} IN ('pending','confirmed','superseded') AND ${t.notificationState} IN ('pending','sent','skipped','rejected')`),index().on(t.nextAttemptAt,t.cacheState)]);

export const pageMetadataEditions=editorial.table('page_metadata_editions',{
 id:id(),siteId:text('site_id').notNull().references(()=>sites.id),locale:text('locale').notNull(),path:text('path').notNull(),page:integer('page').notNull(),seo:jsonb('seo').$type<{title:string;description:string}>().notNull(),isTest:boolean('is_test').notNull(),approvedBy:uuid('approved_by').notNull().references(()=>principals.id),createdAt:created(),
},t=>[index().on(t.siteId,t.path,t.page,t.createdAt)]);

export const networkAnchorClaims=editorial.table('network_anchor_claims',{
 siteId:text('site_id').notNull().references(()=>sites.id),anchor:text('anchor').notNull(),articleId:uuid('article_id').notNull().references(()=>articles.id),
},t=>[primaryKey({columns:[t.siteId,t.anchor]})]);
export const networkLinks=editorial.table('network_links',{
 id:id(),siteId:text('site_id').notNull().references(()=>sites.id),articleId:uuid('article_id').notNull().references(()=>articles.id),revisionId:uuid('revision_id').notNull().references(()=>revisions.id),
 blockIndex:integer('block_index').notNull(),anchor:text('anchor').notNull(),normalizedAnchor:text('normalized_anchor').notNull(),peerId:text('peer_id').notNull(),destination:text('destination').notNull(),topicSlug:text('topic_slug').notNull(),justification:text('justification').notNull(),registryVersion:integer('registry_version').notNull(),
 approvedBy:uuid('approved_by').notNull().references(()=>principals.id),enabled:boolean('enabled').notNull().default(true),isTest:boolean('is_test').notNull(),createdAt:created(),
},t=>[unique().on(t.revisionId,t.normalizedAnchor),index().on(t.siteId,t.articleId,t.revisionId)]);
