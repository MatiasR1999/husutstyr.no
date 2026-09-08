CREATE OR REPLACE VIEW editorial.published_articles WITH (security_barrier=true) AS
 SELECT a.id,a.site_id,a.locale,a.namespace,a.slug,a.kind,a.is_test,a.published_at,a.modified_at,r.id AS revision_id,r.payload,r.author_snapshot,c.name AS category_name,r.content_hash,r.author_id
 FROM editorial.articles a JOIN editorial.revisions r ON r.id=a.published_revision_id AND r.article_id=a.id JOIN editorial.categories c ON c.id=a.category_id
 WHERE a.status='published' AND EXISTS(SELECT 1 FROM editorial.approvals ap WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash);
CREATE VIEW editorial.public_routes WITH (security_barrier=true) AS
 SELECT site_id,is_test,'/'||namespace||'/'||slug AS path,200 AS status,NULL::text AS destination FROM editorial.published_articles
 UNION ALL SELECT site_id,is_test,from_path,status,to_path FROM editorial.redirects;
CREATE OR REPLACE FUNCTION editorial.documents(token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p editorial.principals; result jsonb;
BEGIN
 p=editorial.actor(token);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'slug',a.slug,'namespace',a.namespace,'revisionId',r.id,'publishedRevisionId',a.published_revision_id,'payload',r.payload,'status',a.status,'approved',EXISTS(SELECT 1 FROM editorial.approvals ap WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash),'publicationEventId',(SELECT id FROM editorial.publication_events WHERE article_id=a.id ORDER BY created_at DESC,id DESC LIMIT 1)) ORDER BY a.created_at DESC),'[]') INTO result FROM editorial.articles a JOIN editorial.revisions r ON r.id=a.current_revision_id WHERE a.site_id=p.site_id AND a.is_test=p.is_test AND (p.role='editor' OR r.author_id=p.author_id);
 RETURN result;
END $$;
--> statement-breakpoint
REVOKE ALL ON editorial.publication_jobs FROM PUBLIC,seo_public_reader,seo_editor_service;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA editorial FROM PUBLIC;
GRANT SELECT ON editorial.public_routes TO seo_public_reader;
GRANT EXECUTE ON FUNCTION editorial.change_publication(text,uuid,uuid,text,uuid),editorial.publication_status(text,uuid),editorial.claim_publication_job(uuid,text,boolean),editorial.finish_publication_job(uuid,uuid,text,text,text,integer),editorial.due_publication_jobs(text,boolean),editorial.set_redirect(text,text,text,integer) TO seo_editor_service;
