import 'server-only';
import { sql, eq, and, gt } from 'drizzle-orm';
import { z } from 'zod';
import site from '@site';
import { createDatabase } from '@/lib/db/client';
import { principals, sessions, categories } from '@/lib/db/schema';
import { contentSchema, parseContent } from '@/lib/domain/content';
import { readRuntimeConfig } from '@/lib/config';
import { normalizeSlug } from '@/lib/slug';

export function editorDb() {
  const connection = process.env.EDITOR_DATABASE_URL;
  if (!connection || new URL(connection).username!=='seo_editor_service') throw new Error('Restricted editorial database is not configured');
  return createDatabase(connection);
}
export async function principalForSession(hash: string) {
  const rows = await editorDb().select({ principal: principals }).from(sessions).innerJoin(principals, eq(sessions.principalId, principals.id)).where(and(eq(sessions.tokenHash, hash),gt(sessions.expiresAt, new Date().toISOString()),eq(principals.enabled,true),eq(principals.siteId,site.id),eq(principals.isTest,readRuntimeConfig(process.env).qa))).limit(1);
  return rows[0]?.principal ?? null;
}
export const documentSchema = z.object({ id:z.uuid(),slug:z.string(),namespace:z.string(),revisionId:z.uuid(),publishedRevisionId:z.uuid().nullable(),publicationEventId:z.uuid().nullable(),payload:contentSchema,status:z.enum(['draft','in_review','published']),approved:z.boolean(),submitted:z.boolean().default(false) });
export async function documents(hash:string) {
  const rows = await editorDb().execute<{ data:unknown }>(sql`select editorial.documents(${hash}) as data`);
  return z.array(documentSchema).parse(rows.rows[0]?.data);
}
export async function editableCategories(hash:string) {
  const principal = await principalForSession(hash);
  if (!principal || principal.role==='viewer') throw new Error('Unauthorized');
  return editorDb().select().from(categories).where(and(eq(categories.siteId,site.id),eq(categories.locale,site.locale)));
}
export async function createArticle(hash:string,category:string,content:unknown) {
  const payload=parseContent(content);
  const rows=await editorDb().execute<{ id:string }>(sql`select editorial.create_article(${hash},${z.uuid().parse(category)},${payload.kind==='page'?payload.page.slug:normalizeSlug(payload.title)},${JSON.stringify(payload)}::jsonb,${readRuntimeConfig(process.env).qa}) as id`);
  return z.uuid().parse(rows.rows[0]?.id);
}
export async function saveRevision(hash:string,id:string,revision:string,content:unknown) {
  const payload=parseContent(content);
  const rows=await editorDb().execute<{ id:string }>(sql`select editorial.save_revision(${hash},${z.uuid().parse(id)},${z.uuid().parse(revision)},${JSON.stringify(payload)}::jsonb) as id`);
  return z.uuid().parse(rows.rows[0]?.id);
}
export async function reviewRevision(hash:string,id:string,revision:string,action:'submit'|'approve') {
  const article=z.uuid().parse(id), expected=z.uuid().parse(revision);
  if(action==='approve') await editorDb().execute(sql`select editorial.approve_revision(${hash},${article},${expected})`);
  else await editorDb().execute(sql`select editorial.submit_revision(${hash},${article},${expected})`);
}
