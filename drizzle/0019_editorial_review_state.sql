CREATE OR REPLACE FUNCTION editorial.documents(token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p editorial.principals; result jsonb;
BEGIN
 p=editorial.actor(token);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'slug',a.slug,'namespace',a.namespace,'revisionId',r.id,'publishedRevisionId',a.published_revision_id,'payload',r.payload,'status',a.status,'approved',EXISTS(SELECT 1 FROM editorial.approvals ap WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash),'submitted',EXISTS(SELECT 1 FROM editorial.review_requests q WHERE q.revision_id=r.id),'publicationEventId',(SELECT id FROM editorial.publication_events WHERE article_id=a.id ORDER BY created_at DESC,id DESC LIMIT 1)) ORDER BY a.created_at DESC),'[]') INTO result FROM editorial.articles a JOIN editorial.revisions r ON r.id=a.current_revision_id WHERE a.site_id=p.site_id AND a.is_test=p.is_test AND (p.role='editor' OR r.author_id=p.author_id);
 RETURN result;
END $$;
