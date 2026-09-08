CREATE FUNCTION editorial.article_path(namespace text,slug text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,editorial,pg_temp AS $$ SELECT CASE WHEN namespace='_pages' THEN '/'||slug ELSE '/'||namespace||'/'||slug END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION editorial.article_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE expected text;
BEGIN
 SELECT CASE WHEN NEW.kind='page' THEN '_pages' WHEN NEW.kind='review' THEN 'anmeldelser' ELSE slug END INTO expected FROM categories WHERE id=NEW.category_id AND site_id=NEW.site_id AND locale=NEW.locale;
 IF NEW.namespace IS DISTINCT FROM expected THEN RAISE EXCEPTION 'invalid_route_namespace'; END IF;
 IF TG_OP='UPDATE' AND (OLD.site_id,OLD.locale,OLD.category_id,OLD.namespace,OLD.slug,OLD.kind,OLD.is_test) IS DISTINCT FROM (NEW.site_id,NEW.locale,NEW.category_id,NEW.namespace,NEW.slug,NEW.kind,NEW.is_test) THEN RAISE EXCEPTION 'immutable_article_identity'; END IF;
 IF NEW.status='published' THEN
  IF NEW.published_revision_id IS NULL OR NOT EXISTS(SELECT 1 FROM revisions r JOIN approvals ap ON ap.revision_id=r.id AND ap.content_hash=r.content_hash JOIN principals p ON p.id=ap.approved_by WHERE r.id=NEW.published_revision_id AND r.article_id=NEW.id AND p.role='editor' AND p.site_id=NEW.site_id AND p.is_test=NEW.is_test) THEN RAISE EXCEPTION 'publication_requires_approved_revision'; END IF;
 END IF;
 IF NEW.kind='page' AND NOT NEW.slug=ANY((SELECT trust_routes FROM sites WHERE id=NEW.site_id)) THEN RAISE EXCEPTION 'unregistered_trust_route'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION editorial.create_article(token text,category uuid,base_slug text,content jsonb,test_data boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p principals; c categories; a articles; candidate text; n integer=1;
BEGIN
 p=actor(token);
 SELECT * INTO STRICT c FROM categories WHERE id=category AND site_id=p.site_id;
 IF test_data<>p.is_test OR p.author_id IS NULL OR base_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(base_slug)>100 THEN RAISE EXCEPTION 'invalid_article_identity'; END IF;
 IF content->>'kind'='page' AND content->'page'->>'slug' IS DISTINCT FROM base_slug THEN RAISE EXCEPTION 'invalid_page_route'; END IF;
 LOOP
  IF n>1 AND content->>'kind'='page' THEN RAISE EXCEPTION 'duplicate_page'; END IF;
  candidate=CASE WHEN n=1 THEN base_slug ELSE rtrim(left(base_slug,100-length(n::text)-1),'-') || '-' || n::text END;
  INSERT INTO articles(site_id,locale,category_id,namespace,slug,kind,is_test) VALUES(p.site_id,c.locale,c.id,CASE WHEN content->>'kind'='page' THEN '_pages' WHEN content->>'kind'='review' THEN 'anmeldelser' ELSE c.slug END,candidate,content->>'kind',test_data) ON CONFLICT (site_id,locale,namespace,slug) DO NOTHING RETURNING * INTO a;
  EXIT WHEN a.id IS NOT NULL;
  n=n+1;
 END LOOP;
 PERFORM append_revision(a,p,content);
 RETURN a.id;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION editorial.revision_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE a articles; au authors; p principals;
BEGIN
 SELECT * INTO STRICT a FROM articles WHERE id=NEW.article_id;
 SELECT * INTO STRICT au FROM authors WHERE id=NEW.author_id AND site_id=a.site_id AND is_test=a.is_test;
 SELECT * INTO STRICT p FROM principals WHERE id=NEW.created_by AND site_id=a.site_id AND enabled AND role IN ('writer','editor') AND is_test=a.is_test;
 IF p.role='writer' AND p.author_id<>au.id THEN RAISE EXCEPTION 'forbidden_author'; END IF;
 IF NEW.payload->>'kind' IS DISTINCT FROM a.kind OR NEW.payload->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(NEW.payload->'blocks') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.payload->'blocks')=0 THEN RAISE EXCEPTION 'invalid_content'; END IF;
 NEW.author_snapshot=jsonb_build_object('id',au.id,'name',au.name,'slug',au.slug,'bio',au.bio,'is_test',au.is_test,'image',au.image,'expertise',au.expertise,'sameAs',au.same_as);
 IF a.kind='page' AND NEW.payload->'page'->>'slug' IS DISTINCT FROM a.slug THEN RAISE EXCEPTION 'immutable_page_path'; END IF;
 NEW.review_snapshot=NULL;
 IF a.kind='review' THEN
  SELECT jsonb_build_object('id',pr.id,'name',pr.name,'manufacturer',pr.manufacturer,'identifier',pr.identifier,'owned',pr.owned,'price',(SELECT jsonb_build_object('amount',p0.amount::text,'currency',p0.currency,'source',p0.source,'checkedAt',p0.checked_at,'validUntil',p0.valid_until) FROM prices p0 WHERE p0.product_id=pr.id AND p0.checked_at<=now() AND p0.valid_until>now() AND p0.valid_until<=p0.checked_at+interval '24 hours' ORDER BY p0.checked_at DESC,p0.id LIMIT 1)) INTO STRICT NEW.review_snapshot FROM products pr WHERE pr.id=(NEW.payload->'review'->>'productId')::uuid AND pr.site_id=a.site_id;
 END IF;
 NEW.content_hash=encode(sha256(convert_to(NEW.payload::text || NEW.author_snapshot::text || coalesce(NEW.review_snapshot::text,''),'UTF8')),'hex');
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER immutable_page_metadata BEFORE UPDATE OR DELETE ON editorial.page_metadata_editions FOR EACH ROW EXECUTE FUNCTION editorial.immutable();
CREATE FUNCTION editorial.register_page_metadata(token text,path text,page_number integer,copy jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p editorial.principals; result uuid;
BEGIN
 p=editorial.actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF path !~ '^(/[a-z0-9]+(-[a-z0-9]+)*){1,2}$' OR path ~ '^/(api|go|redaksjon|og|visninger)(/|$)' OR page_number<1 OR length(copy->>'title') NOT BETWEEN 50 AND 60 OR length(copy->>'description') NOT BETWEEN 140 AND 160 OR NOT (copy ? 'title' AND copy ? 'description') THEN RAISE EXCEPTION 'invalid_metadata'; END IF;
 IF NOT p.is_test AND copy::text LIKE '%TODO:%' THEN RAISE EXCEPTION 'unfinished_metadata'; END IF;
 INSERT INTO editorial.page_metadata_editions(site_id,locale,path,page,seo,is_test,approved_by) VALUES(p.site_id,'nb',path,page_number,copy,p.is_test,p.id) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE VIEW editorial.public_page_metadata WITH (security_barrier=true) AS SELECT DISTINCT ON (site_id,locale,path,page,is_test) * FROM editorial.page_metadata_editions ORDER BY site_id,locale,path,page,is_test,created_at DESC,id DESC;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION editorial.change_publication(token text,article uuid,expected uuid,operation text,request_key uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p editorial.principals; a editorial.articles; r editorial.revisions; prior editorial.revisions; previous editorial.publication_events; eid uuid; changed boolean; path text; authors jsonb; topics jsonb;
BEGIN
 p=editorial.actor(token);
 IF p.role<>'editor' OR operation NOT IN ('publish','withdraw') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p.site_id));
 SELECT * INTO STRICT a FROM editorial.articles WHERE id=article AND site_id=p.site_id AND is_test=p.is_test FOR UPDATE;
 SELECT * INTO previous FROM editorial.publication_events WHERE idempotency_key=request_key::text;
 IF previous.id IS NOT NULL THEN
  IF previous.article_id<>a.id OR previous.revision_id IS DISTINCT FROM expected OR previous.event<>operation THEN RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='23505'; END IF;
  RETURN previous.id;
 END IF;
 path=editorial.article_path(a.namespace,a.slug);
 SELECT * INTO prior FROM editorial.revisions WHERE id=coalesce(a.published_revision_id,(SELECT revision_id FROM editorial.publication_events WHERE article_id=a.id AND event='publish' ORDER BY created_at DESC,id DESC LIMIT 1));
 IF operation='publish' THEN
  IF a.current_revision_id IS DISTINCT FROM expected THEN RAISE EXCEPTION 'stale_revision' USING ERRCODE='40001'; END IF;
  SELECT * INTO STRICT r FROM editorial.revisions WHERE id=expected AND article_id=a.id;
  IF NOT EXISTS(SELECT 1 FROM editorial.approvals ap JOIN editorial.principals approver ON approver.id=ap.approved_by WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash AND approver.enabled AND approver.role='editor' AND approver.site_id=a.site_id AND approver.is_test=a.is_test) THEN RAISE EXCEPTION 'approval_required' USING ERRCODE='42501'; END IF;
  IF NOT a.is_test AND (r.payload::text LIKE '%TODO:%' OR r.author_snapshot::text LIKE '%TODO:%' OR r.author_snapshot->>'is_test'='true') THEN RAISE EXCEPTION 'unfinished_content'; END IF;
  changed=prior.content_hash IS DISTINCT FROM r.content_hash;
  DELETE FROM editorial.redirects WHERE site_id=a.site_id AND from_path=path;
  UPDATE editorial.articles SET status='published',published_revision_id=r.id,published_at=coalesce(a.published_at,clock_timestamp()),modified_at=CASE WHEN changed THEN clock_timestamp() ELSE coalesce(a.modified_at,clock_timestamp()) END WHERE id=a.id RETURNING * INTO a;
 ELSE
  IF a.published_revision_id IS NULL OR a.published_revision_id IS DISTINCT FROM expected THEN RAISE EXCEPTION 'stale_publication' USING ERRCODE='40001'; END IF;
  r=prior; changed=true;
  UPDATE editorial.articles SET status='draft',published_revision_id=NULL WHERE id=a.id RETURNING * INTO a;
  INSERT INTO editorial.redirects(site_id,from_path,to_path,status,is_test) VALUES(a.site_id,path,NULL,410,a.is_test) ON CONFLICT(site_id,from_path) DO UPDATE SET status=410,to_path=NULL,is_test=excluded.is_test;
  UPDATE editorial.redirects SET status=410,to_path=NULL WHERE site_id=a.site_id AND to_path=path;
 END IF;
 SELECT coalesce(jsonb_agg(DISTINCT author_snapshot->>'slug'),'[]') INTO authors FROM editorial.revisions WHERE id IN (prior.id,r.id);
 SELECT coalesce(jsonb_agg(DISTINCT topic_id),'[]') INTO topics FROM editorial.revision_topics WHERE revision_id IN (prior.id,r.id);
 UPDATE editorial.publication_jobs j SET cache_state='superseded',notification_state='skipped',lease_token=NULL,lease_until=NULL FROM editorial.publication_events e WHERE j.event_id=e.id AND e.article_id=a.id AND (j.cache_state='pending' OR j.notification_state='pending');
 INSERT INTO editorial.publication_events(article_id,revision_id,actor_id,event,idempotency_key) VALUES(a.id,expected,p.id,operation,request_key::text) RETURNING id INTO eid;
 INSERT INTO editorial.publication_jobs(event_id,snapshot,notification_state) VALUES(eid,jsonb_build_object('articleId',a.id,'siteId',a.site_id,'locale',a.locale,'isTest',a.is_test,'path',path,'namespace',a.namespace,'revisionId',r.id,'contentHash',r.content_hash,'authors',authors,'topics',topics,'operation',operation,'changed',changed),CASE WHEN changed AND operation='publish' AND NOT a.is_test THEN 'pending' ELSE 'skipped' END);
 RETURN eid;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION editorial.set_redirect(token text,source text,destination text,code integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p editorial.principals; target text=destination; next_target text; seen text[]=ARRAY[source];
BEGIN
 p=editorial.actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p.site_id));
 IF source !~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$' OR source ~ '^/(api|go|redaksjon)(/|$)' OR code NOT IN (301,410) THEN RAISE EXCEPTION 'invalid_redirect' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM editorial.articles WHERE site_id=p.site_id AND editorial.article_path(namespace,slug)=source AND status='published') THEN RAISE EXCEPTION 'cannot_redirect_live_article' USING ERRCODE='23514'; END IF;
 IF code=301 THEN
  LOOP
   IF target=ANY(seen) OR array_length(seen,1)>50 THEN RAISE EXCEPTION 'redirect_cycle' USING ERRCODE='23514'; END IF;
   seen=array_append(seen,target);
   SELECT to_path INTO next_target FROM editorial.redirects WHERE site_id=p.site_id AND from_path=target AND status=301;
   EXIT WHEN next_target IS NULL;
   target=next_target;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM editorial.articles WHERE site_id=p.site_id AND is_test=p.is_test AND editorial.article_path(namespace,slug)=target AND status='published' AND published_revision_id IS NOT NULL) THEN RAISE EXCEPTION 'redirect_target_not_published' USING ERRCODE='23514'; END IF;
 ELSE
  IF destination IS NOT NULL THEN RAISE EXCEPTION 'invalid_tombstone' USING ERRCODE='23514'; END IF;
  target=NULL;
 END IF;
 INSERT INTO editorial.redirects(site_id,from_path,to_path,status,is_test) VALUES(p.site_id,source,target,code,p.is_test) ON CONFLICT(site_id,from_path) DO UPDATE SET to_path=excluded.to_path,status=excluded.status,is_test=excluded.is_test;
 UPDATE editorial.redirects SET to_path=target,status=code WHERE site_id=p.site_id AND to_path=source;
END $$;
--> statement-breakpoint
CREATE OR REPLACE VIEW editorial.published_articles WITH (security_barrier=true) AS
 SELECT a.id,a.site_id,a.locale,a.namespace,a.slug,a.kind,a.is_test,a.published_at,a.modified_at,r.id AS revision_id,r.payload,r.author_snapshot,c.name AS category_name,r.content_hash,r.author_id,c.slug AS pillar_slug,r.review_snapshot
 FROM editorial.articles a JOIN editorial.revisions r ON r.id=a.published_revision_id AND r.article_id=a.id JOIN editorial.categories c ON c.id=a.category_id
 WHERE a.status='published' AND EXISTS(SELECT 1 FROM editorial.approvals ap WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash);
CREATE OR REPLACE VIEW editorial.public_routes WITH (security_barrier=true) AS
 SELECT site_id,is_test,editorial.article_path(namespace,slug) AS path,200 AS status,NULL::text AS destination FROM editorial.published_articles
 UNION ALL SELECT site_id,is_test,from_path,status,to_path FROM editorial.redirects;
CREATE VIEW editorial.public_topics WITH (security_barrier=true) AS
 SELECT DISTINCT t.*,a.is_test FROM editorial.topics t JOIN editorial.revision_topics rt ON rt.topic_id=t.id JOIN editorial.published_articles a ON a.revision_id=rt.revision_id WHERE a.kind<>'page';
REVOKE ALL ON editorial.page_metadata_editions FROM PUBLIC,seo_editor_service,seo_public_reader;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA editorial FROM PUBLIC;
GRANT SELECT ON editorial.public_page_metadata,editorial.public_topics TO seo_public_reader;
GRANT EXECUTE ON FUNCTION editorial.article_path(text,text) TO seo_public_reader,seo_editor_service;
GRANT EXECUTE ON FUNCTION editorial.register_page_metadata(text,text,integer,jsonb) TO seo_editor_service;

