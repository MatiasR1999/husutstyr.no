-- Atomic editorial operations; runtime roles never receive base-table write access.
ALTER TABLE editorial.articles ADD CONSTRAINT current_revision_owner FOREIGN KEY (id,current_revision_id) REFERENCES editorial.revisions(article_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE editorial.articles ADD CONSTRAINT published_revision_owner FOREIGN KEY (id,published_revision_id) REFERENCES editorial.revisions(article_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE FUNCTION editorial.immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable_revision_data' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_revision BEFORE UPDATE OR DELETE ON editorial.revisions FOR EACH ROW EXECUTE FUNCTION editorial.immutable();
CREATE TRIGGER immutable_approval BEFORE UPDATE OR DELETE ON editorial.approvals FOR EACH ROW EXECUTE FUNCTION editorial.immutable();
CREATE TRIGGER immutable_research BEFORE UPDATE OR DELETE ON editorial.original_research FOR EACH ROW EXECUTE FUNCTION editorial.immutable();
CREATE TRIGGER immutable_source BEFORE UPDATE OR DELETE ON editorial.sources FOR EACH ROW EXECUTE FUNCTION editorial.immutable();
CREATE TRIGGER immutable_review BEFORE UPDATE OR DELETE ON editorial.review_details FOR EACH ROW EXECUTE FUNCTION editorial.immutable();
CREATE TRIGGER immutable_topic BEFORE UPDATE OR DELETE ON editorial.revision_topics FOR EACH ROW EXECUTE FUNCTION editorial.immutable();
--> statement-breakpoint
CREATE FUNCTION editorial.category_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=editorial,pg_catalog AS $$
BEGIN
 IF NEW.slug = ANY((SELECT reserved_routes FROM sites WHERE id=NEW.site_id)) THEN RAISE EXCEPTION 'reserved_category'; END IF;
 IF TG_OP='UPDATE' AND (OLD.slug,OLD.site_id,OLD.locale) IS DISTINCT FROM (NEW.slug,NEW.site_id,NEW.locale) THEN RAISE EXCEPTION 'immutable_category_route'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER category_guard BEFORE INSERT OR UPDATE ON editorial.categories FOR EACH ROW EXECUTE FUNCTION editorial.category_guard();
CREATE FUNCTION editorial.article_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=editorial,pg_catalog AS $$
DECLARE expected text;
BEGIN
 SELECT CASE WHEN NEW.kind='review' THEN 'anmeldelser' ELSE slug END INTO expected FROM categories WHERE id=NEW.category_id AND site_id=NEW.site_id AND locale=NEW.locale;
 IF NEW.namespace IS DISTINCT FROM expected THEN RAISE EXCEPTION 'invalid_route_namespace'; END IF;
 IF TG_OP='UPDATE' AND (OLD.site_id,OLD.locale,OLD.category_id,OLD.namespace,OLD.slug,OLD.kind,OLD.is_test) IS DISTINCT FROM (NEW.site_id,NEW.locale,NEW.category_id,NEW.namespace,NEW.slug,NEW.kind,NEW.is_test) THEN RAISE EXCEPTION 'immutable_article_identity'; END IF;
 IF NEW.status='published' THEN
  IF NEW.published_revision_id IS NULL OR NOT EXISTS(SELECT 1 FROM revisions r JOIN approvals ap ON ap.revision_id=r.id AND ap.content_hash=r.content_hash JOIN principals p ON p.id=ap.approved_by WHERE r.id=NEW.published_revision_id AND r.article_id=NEW.id AND p.role='editor' AND p.site_id=NEW.site_id AND p.is_test=NEW.is_test) THEN RAISE EXCEPTION 'publication_requires_approved_revision'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER article_guard BEFORE INSERT OR UPDATE ON editorial.articles FOR EACH ROW EXECUTE FUNCTION editorial.article_guard();
--> statement-breakpoint
CREATE FUNCTION editorial.revision_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=editorial,pg_catalog AS $$
DECLARE a articles; au authors; p principals;
BEGIN
 SELECT * INTO STRICT a FROM articles WHERE id=NEW.article_id;
 SELECT * INTO STRICT au FROM authors WHERE id=NEW.author_id AND site_id=a.site_id AND is_test=a.is_test;
 SELECT * INTO STRICT p FROM principals WHERE id=NEW.created_by AND site_id=a.site_id AND enabled AND role IN ('writer','editor') AND is_test=a.is_test;
 IF p.role='writer' AND p.author_id<>au.id THEN RAISE EXCEPTION 'forbidden_author'; END IF;
 IF NEW.payload->>'kind' IS DISTINCT FROM a.kind OR NEW.payload->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(NEW.payload->'blocks') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.payload->'blocks')=0 THEN RAISE EXCEPTION 'invalid_content'; END IF;
 NEW.author_snapshot=jsonb_build_object('id',au.id,'name',au.name,'slug',au.slug,'bio',au.bio,'is_test',au.is_test);
 NEW.content_hash=encode(sha256(convert_to(NEW.payload::text || NEW.author_snapshot::text,'UTF8')),'hex');
 RETURN NEW;
END $$;
CREATE TRIGGER revision_guard BEFORE INSERT ON editorial.revisions FOR EACH ROW EXECUTE FUNCTION editorial.revision_guard();
CREATE FUNCTION editorial.approval_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=editorial,pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM revisions r JOIN articles a ON a.id=r.article_id JOIN principals p ON p.id=NEW.approved_by JOIN review_requests q ON q.revision_id=r.id WHERE r.id=NEW.revision_id AND a.current_revision_id=r.id AND r.content_hash=NEW.content_hash AND p.enabled AND p.role='editor' AND p.site_id=a.site_id AND p.is_test=a.is_test) THEN RAISE EXCEPTION 'invalid_approval' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER approval_guard BEFORE INSERT ON editorial.approvals FOR EACH ROW EXECUTE FUNCTION editorial.approval_guard();
--> statement-breakpoint
CREATE FUNCTION editorial.actor(token text) RETURNS editorial.principals LANGUAGE plpgsql SECURITY DEFINER SET search_path=editorial,pg_catalog AS $$
DECLARE p principals;
BEGIN
 SELECT p0.* INTO p FROM principals p0 JOIN sessions s ON s.principal_id=p0.id WHERE s.token_hash=token AND s.expires_at>now() AND p0.enabled AND p0.role IN ('writer','editor');
 IF p.id IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 RETURN p;
END $$;
CREATE FUNCTION editorial.append_revision(a editorial.articles,p editorial.principals,content jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=editorial,pg_catalog AS $$
DECLARE rid uuid; au uuid; item jsonb;
BEGIN
 SELECT author_id INTO au FROM revisions WHERE id=a.current_revision_id;
 au=coalesce(au,p.author_id);
 INSERT INTO revisions(article_id,author_id,created_by,payload,author_snapshot,content_hash) VALUES(a.id,au,p.id,content,'{}','pending') RETURNING id INTO rid;
 FOR item IN SELECT * FROM jsonb_array_elements(content->'sources') LOOP
  INSERT INTO sources(revision_id,url,title,checked_at) VALUES(rid,item->>'url',item->>'title',(item->>'checkedAt')::timestamptz);
 END LOOP;
 FOR item IN SELECT * FROM jsonb_array_elements(content->'research') LOOP
  IF NOT EXISTS(SELECT 1 FROM authors WHERE id=(item->>'responsibleAuthorId')::uuid AND site_id=a.site_id AND is_test=a.is_test) THEN RAISE EXCEPTION 'invalid_research_author'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(item->'evidence') e WHERE e ? 'assetId' AND NOT EXISTS(SELECT 1 FROM assets WHERE id=(e->>'assetId')::uuid AND site_id=a.site_id)) THEN RAISE EXCEPTION 'invalid_evidence_asset'; END IF;
  INSERT INTO original_research(revision_id,method,responsible_author_id,performed_at,evidence) VALUES(rid,item->>'method',(item->>'responsibleAuthorId')::uuid,(item->>'performedAt')::timestamptz,item->'evidence');
 END LOOP;
 FOR item IN SELECT * FROM jsonb_array_elements(content->'topicIds') LOOP
  IF NOT EXISTS(SELECT 1 FROM topics WHERE id=(item#>>'{}')::uuid AND site_id=a.site_id AND locale=a.locale) THEN RAISE EXCEPTION 'invalid_topic'; END IF;
  INSERT INTO revision_topics VALUES(rid,(item#>>'{}')::uuid);
 END LOOP;
 FOR item IN SELECT value->'image' FROM jsonb_array_elements(content->'blocks') WHERE value->>'type'='image' LOOP
  IF NOT EXISTS(SELECT 1 FROM assets WHERE id=(item->>'assetId')::uuid AND site_id=a.site_id AND provider='vercel-blob' AND url=item->>'url' AND alt=item->>'alt' AND rights=item->>'rights' AND width=(item->>'width')::integer AND height=(item->>'height')::integer) THEN RAISE EXCEPTION 'invalid_image_reference'; END IF;
 END LOOP;
 IF a.kind='review' THEN
  item=content->'review';
  IF NOT EXISTS(SELECT 1 FROM products WHERE id=(item->>'productId')::uuid AND site_id=a.site_id) THEN RAISE EXCEPTION 'invalid_product'; END IF;
  INSERT INTO review_details VALUES(rid,(item->>'productId')::uuid,(item->>'rating')::numeric,(item->>'paid')::boolean,item->>'method');
 END IF;
 UPDATE articles SET current_revision_id=rid,status=CASE WHEN published_revision_id IS NULL THEN 'draft' ELSE 'published' END WHERE id=a.id;
 RETURN rid;
END $$;
--> statement-breakpoint
CREATE FUNCTION editorial.create_article(token text,category uuid,base_slug text,content jsonb,test_data boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=editorial,pg_catalog AS $$
DECLARE p principals; c categories; a articles; candidate text; n integer=1;
BEGIN
 p=actor(token);
 SELECT * INTO STRICT c FROM categories WHERE id=category AND site_id=p.site_id;
 IF test_data<>p.is_test OR p.author_id IS NULL OR base_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(base_slug)>100 THEN RAISE EXCEPTION 'invalid_article_identity'; END IF;
 LOOP
  candidate=CASE WHEN n=1 THEN base_slug ELSE rtrim(left(base_slug,100-length(n::text)-1),'-') || '-' || n::text END;
  INSERT INTO articles(site_id,locale,category_id,namespace,slug,kind,is_test) VALUES(p.site_id,c.locale,c.id,CASE WHEN content->>'kind'='review' THEN 'anmeldelser' ELSE c.slug END,candidate,content->>'kind',test_data) ON CONFLICT (site_id,locale,namespace,slug) DO NOTHING RETURNING * INTO a;
  EXIT WHEN a.id IS NOT NULL;
  n=n+1;
 END LOOP;
 PERFORM append_revision(a,p,content);
 RETURN a.id;
END $$;
CREATE FUNCTION editorial.save_revision(token text,article uuid,expected uuid,content jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=editorial,pg_catalog AS $$
DECLARE p principals; a articles;
BEGIN
 p=actor(token);
 SELECT * INTO STRICT a FROM articles WHERE id=article AND site_id=p.site_id AND is_test=p.is_test FOR UPDATE;
 IF a.current_revision_id IS DISTINCT FROM expected THEN RAISE EXCEPTION 'stale_revision' USING ERRCODE='40001'; END IF;
 IF p.role='writer' AND NOT EXISTS(SELECT 1 FROM revisions WHERE id=expected AND author_id=p.author_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 RETURN append_revision(a,p,content);
END $$;
CREATE FUNCTION editorial.submit_revision(token text,article uuid,expected uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=editorial,pg_catalog AS $$
DECLARE p principals; a articles;
BEGIN
 p=actor(token);
 SELECT * INTO STRICT a FROM articles WHERE id=article AND site_id=p.site_id AND is_test=p.is_test FOR UPDATE;
 IF a.current_revision_id IS DISTINCT FROM expected THEN RAISE EXCEPTION 'stale_revision' USING ERRCODE='40001'; END IF;
 IF p.role='writer' AND NOT EXISTS(SELECT 1 FROM revisions WHERE id=expected AND author_id=p.author_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 INSERT INTO review_requests(revision_id,submitted_by) VALUES(expected,p.id) ON CONFLICT DO NOTHING;
 UPDATE articles SET status=CASE WHEN published_revision_id IS NULL THEN 'in_review' ELSE 'published' END WHERE id=a.id;
END $$;
CREATE FUNCTION editorial.approve_revision(token text,article uuid,expected uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=editorial,pg_catalog AS $$
DECLARE p principals; a articles;
BEGIN
 p=actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT a FROM articles WHERE id=article AND site_id=p.site_id AND is_test=p.is_test FOR UPDATE;
 IF a.current_revision_id IS DISTINCT FROM expected THEN RAISE EXCEPTION 'stale_revision' USING ERRCODE='40001'; END IF;
 INSERT INTO approvals(revision_id,content_hash,approved_by) SELECT id,content_hash,p.id FROM revisions WHERE id=expected ON CONFLICT DO NOTHING;
END $$;
--> statement-breakpoint
CREATE FUNCTION editorial.documents(token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=editorial,pg_catalog AS $$
DECLARE p principals; result jsonb;
BEGIN
 p=actor(token);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'slug',a.slug,'namespace',a.namespace,'revisionId',r.id,'payload',r.payload,'status',a.status,'approved',EXISTS(SELECT 1 FROM approvals ap WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash)) ORDER BY a.created_at DESC),'[]') INTO result FROM articles a JOIN revisions r ON r.id=a.current_revision_id WHERE a.site_id=p.site_id AND a.is_test=p.is_test AND (p.role='editor' OR r.author_id=p.author_id);
 RETURN result;
END $$;
CREATE VIEW editorial.published_articles WITH (security_barrier=true) AS
 SELECT a.id,a.site_id,a.locale,a.namespace,a.slug,a.kind,a.is_test,a.published_at,a.modified_at,r.id AS revision_id,r.payload,r.author_snapshot,c.name AS category_name
 FROM editorial.articles a JOIN editorial.revisions r ON r.id=a.published_revision_id AND r.article_id=a.id JOIN editorial.categories c ON c.id=a.category_id
 WHERE a.status='published' AND EXISTS(SELECT 1 FROM editorial.approvals ap WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash);
CREATE VIEW editorial.published_categories WITH (security_barrier=true) AS SELECT c.* FROM editorial.categories c WHERE EXISTS(SELECT 1 FROM editorial.articles a JOIN editorial.published_articles pa ON pa.id=a.id WHERE a.category_id=c.id);
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='seo_public_reader') THEN CREATE ROLE seo_public_reader NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='seo_editor_service') THEN CREATE ROLE seo_editor_service NOLOGIN; END IF;
END $$;
REVOKE ALL ON SCHEMA editorial FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA editorial FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA editorial FROM PUBLIC;
GRANT USAGE ON SCHEMA editorial TO seo_public_reader,seo_editor_service;
GRANT SELECT ON editorial.published_articles,editorial.published_categories TO seo_public_reader;
GRANT SELECT ON editorial.principals,editorial.categories TO seo_editor_service;
GRANT SELECT,INSERT,DELETE ON editorial.sessions,editorial.login_attempts TO seo_editor_service;
GRANT EXECUTE ON FUNCTION editorial.create_article(text,uuid,text,jsonb,boolean),editorial.save_revision(text,uuid,uuid,jsonb),editorial.submit_revision(text,uuid,uuid),editorial.approve_revision(text,uuid,uuid),editorial.documents(text) TO seo_editor_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA editorial REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
