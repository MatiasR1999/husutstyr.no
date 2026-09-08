CREATE OR REPLACE FUNCTION editorial.article_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE expected text;
BEGIN
 SELECT CASE WHEN NEW.kind='page' THEN '_pages' WHEN NEW.kind='review' THEN 'anmeldelser' ELSE slug END INTO expected FROM categories WHERE id=NEW.category_id AND site_id=NEW.site_id AND locale=NEW.locale;
 IF NEW.namespace IS DISTINCT FROM expected THEN RAISE EXCEPTION 'invalid_route_namespace'; END IF;
 IF TG_OP='UPDATE' AND (OLD.site_id,OLD.locale,OLD.category_id,OLD.namespace,OLD.slug,OLD.kind,OLD.is_test) IS DISTINCT FROM (NEW.site_id,NEW.locale,NEW.category_id,NEW.namespace,NEW.slug,NEW.kind,NEW.is_test) THEN RAISE EXCEPTION 'immutable_article_identity'; END IF;
 IF NEW.status='published' THEN
  IF NEW.published_revision_id IS NULL OR NOT EXISTS(SELECT 1 FROM revisions r JOIN approvals ap ON ap.revision_id=r.id AND ap.content_hash=r.content_hash JOIN principals p ON p.id=ap.approved_by WHERE r.id=NEW.published_revision_id AND r.article_id=NEW.id AND p.role='editor' AND p.site_id=NEW.site_id AND p.is_test=NEW.is_test) THEN RAISE EXCEPTION 'publication_requires_approved_revision'; END IF;
 END IF;
 IF NEW.kind='page' AND NOT EXISTS(SELECT 1 FROM sites WHERE id=NEW.site_id AND NEW.slug=ANY(trust_routes)) THEN RAISE EXCEPTION 'unregistered_trust_route'; END IF;
 RETURN NEW;
END $$;
