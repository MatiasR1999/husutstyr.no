CREATE FUNCTION editorial.affiliate_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,editorial,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'affiliate_identity_is_immutable'; END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(OLD)-'enabled') IS DISTINCT FROM (to_jsonb(NEW)-'enabled') THEN RAISE EXCEPTION 'affiliate_identity_is_immutable'; END IF;
 IF NEW.enabled AND (NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(NEW.slug)>100 OR NEW.relationship NOT IN ('commission','owned') OR length(btrim(NEW.disclosure))=0 OR NEW.destination !~ '^https?://[^/@[:space:]\\]+([/?][^[:space:]\\]*)?$' OR position('#' in NEW.destination)>0 OR NOT EXISTS(SELECT 1 FROM sites s WHERE s.id=NEW.site_id AND substring(NEW.destination from '^https?://[^/?#]+')=ANY(s.affiliate_origins)) OR NOT EXISTS(SELECT 1 FROM principals p WHERE p.id=NEW.approved_by AND p.site_id=NEW.site_id AND p.is_test=NEW.is_test AND p.role='editor' AND p.enabled)) THEN RAISE EXCEPTION 'unapproved_affiliate_destination' USING ERRCODE='23514'; END IF;
 IF NEW.product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM products p WHERE p.id=NEW.product_id AND p.site_id=NEW.site_id) THEN RAISE EXCEPTION 'foreign_affiliate_product'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER affiliate_guard BEFORE INSERT OR UPDATE OR DELETE ON editorial.affiliate_links FOR EACH ROW EXECUTE FUNCTION editorial.affiliate_guard();
--> statement-breakpoint
CREATE FUNCTION editorial.register_affiliate(token text,input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p principals; result uuid;
BEGIN
 p=actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF NOT p.is_test AND input::text LIKE '%TODO:%' THEN RAISE EXCEPTION 'unfinished_affiliate'; END IF;
 INSERT INTO affiliate_links(site_id,slug,product_id,destination,disclosure,relationship,is_test,approved_by,enabled) VALUES(p.site_id,input->>'slug',(input->>'productId')::uuid,input->>'destination',input->>'disclosure',input->>'relationship',p.is_test,p.id,true) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION editorial.set_affiliate_enabled(token text,link_id uuid,value boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p principals;
BEGIN
 p=actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 UPDATE affiliate_links SET enabled=value WHERE id=link_id AND site_id=p.site_id AND is_test=p.is_test;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown_affiliate'; END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION editorial.affiliate_revision_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE a articles; item jsonb;
BEGIN
 SELECT * INTO STRICT a FROM articles WHERE id=NEW.article_id;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.payload->'blocks') WHERE value->>'type'='affiliate' LOOP
  IF length(btrim(coalesce(item->>'label','')))=0 OR NOT EXISTS(SELECT 1 FROM affiliate_links l JOIN principals p ON p.id=l.approved_by WHERE l.id=(item->>'linkId')::uuid AND l.site_id=a.site_id AND l.is_test=a.is_test AND l.enabled AND p.enabled AND p.role='editor' AND p.site_id=a.site_id AND p.is_test=a.is_test) THEN RAISE EXCEPTION 'unapproved_affiliate_reference'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER affiliate_revision_guard BEFORE INSERT ON editorial.revisions FOR EACH ROW EXECUTE FUNCTION editorial.affiliate_revision_guard();
CREATE VIEW editorial.public_affiliate_links WITH (security_barrier=true) AS
 SELECT l.id,l.site_id,l.is_test,l.slug,l.destination,l.disclosure,l.relationship FROM editorial.affiliate_links l JOIN editorial.principals p ON p.id=l.approved_by
 WHERE l.enabled AND p.enabled AND p.role='editor' AND p.site_id=l.site_id AND p.is_test=l.is_test
 AND EXISTS(SELECT 1 FROM editorial.sites s WHERE s.id=l.site_id AND substring(l.destination from '^https?://[^/?#]+')=ANY(s.affiliate_origins))
 AND EXISTS(SELECT 1 FROM editorial.published_articles a CROSS JOIN LATERAL jsonb_array_elements(a.payload->'blocks') b WHERE a.site_id=l.site_id AND a.is_test=l.is_test AND b->>'type'='affiliate' AND b->>'linkId'=l.id::text);
--> statement-breakpoint
CREATE FUNCTION editorial.publication_metrics(token text,language text,period_start timestamptz,period_end timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p principals; result jsonb;
BEGIN
 p=actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF period_start IS NULL OR period_end IS NULL OR period_start>=period_end OR NOT EXISTS(SELECT 1 FROM locales WHERE site_id=p.site_id AND locale=language) THEN RAISE EXCEPTION 'invalid_period'; END IF;
 WITH scoped AS (SELECT * FROM articles WHERE site_id=p.site_id AND locale=language AND is_test=p.is_test AND kind<>'page'),
 live AS (SELECT a.id,a.published_revision_id FROM scoped a JOIN revisions r ON r.id=a.published_revision_id WHERE a.status='published' AND EXISTS(SELECT 1 FROM approvals ap WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash)),
 documented AS (SELECT DISTINCT a.id FROM live a JOIN original_research o ON o.revision_id=a.published_revision_id JOIN authors au ON au.id=o.responsible_author_id AND au.site_id=p.site_id AND au.is_test=p.is_test WHERE length(btrim(o.method))>=30 AND jsonb_typeof(o.evidence)='array' AND jsonb_array_length(o.evidence)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(o.evidence) e WHERE length(btrim(coalesce(e->>'description','')))=0 OR NOT (coalesce(e->>'url','') ~ '^https?://[^[:space:]]+$' OR EXISTS(SELECT 1 FROM assets s WHERE s.id::text=e->>'assetId' AND s.site_id=p.site_id AND length(btrim(s.rights))>0))))
 SELECT jsonb_build_object('asOf',statement_timestamp(),'from',period_start,'to',period_end,
 'firstPublishedInPeriod',(SELECT count(*) FROM scoped WHERE published_at>=period_start AND published_at<period_end),
 'publicationEventsInPeriod',(SELECT count(*) FROM publication_events e JOIN scoped a ON a.id=e.article_id WHERE e.event='publish' AND e.created_at>=period_start AND e.created_at<period_end),
 'currentlyPublished',(SELECT count(*) FROM live),'withOriginalResearch',(SELECT count(*) FROM documented),
 'originalResearchShare',(SELECT count(*)::numeric FROM documented)/nullif((SELECT count(*) FROM live),0)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON editorial.affiliate_links FROM PUBLIC,seo_public_reader,seo_editor_service;
REVOKE ALL ON FUNCTION editorial.affiliate_guard(),editorial.affiliate_revision_guard(),editorial.register_affiliate(text,jsonb),editorial.set_affiliate_enabled(text,uuid,boolean),editorial.publication_metrics(text,text,timestamptz,timestamptz) FROM PUBLIC;
GRANT SELECT ON editorial.public_affiliate_links TO seo_public_reader;
GRANT EXECUTE ON FUNCTION editorial.register_affiliate(text,jsonb),editorial.set_affiliate_enabled(text,uuid,boolean),editorial.publication_metrics(text,text,timestamptz,timestamptz) TO seo_editor_service;
