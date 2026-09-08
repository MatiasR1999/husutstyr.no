CREATE FUNCTION editorial.change_publication(token text,article uuid,expected uuid,operation text,request_key uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
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
 path='/' || a.namespace || '/' || a.slug;
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
CREATE FUNCTION editorial.publication_status(token text,event_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p editorial.principals; result jsonb;
BEGIN
 p=editorial.actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(j) INTO result FROM editorial.publication_jobs j JOIN editorial.publication_events e ON e.id=j.event_id JOIN editorial.articles a ON a.id=e.article_id WHERE e.id=publication_status.event_id AND a.site_id=p.site_id AND a.is_test=p.is_test;
 IF result IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
 RETURN result - 'lease_token';
END $$;
CREATE FUNCTION editorial.claim_publication_job(event_id uuid,site text,test_mode boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 UPDATE editorial.publication_jobs j SET lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1
 FROM editorial.publication_events e JOIN editorial.articles a ON a.id=e.article_id
 WHERE j.event_id=claim_publication_job.event_id AND e.id=j.event_id AND a.site_id=site AND a.is_test=test_mode AND j.cache_state<>'superseded' AND (j.cache_state='pending' OR j.notification_state='pending') AND j.next_attempt_at<=now() AND (j.lease_until IS NULL OR j.lease_until<now()) RETURNING to_jsonb(j) INTO result;
 RETURN result;
END $$;
CREATE FUNCTION editorial.finish_publication_job(event_id uuid,lease uuid,cache_status text,notification_status text,error_code text,delay_seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE updated uuid;
BEGIN
 IF cache_status NOT IN ('pending','confirmed') OR notification_status NOT IN ('pending','sent','skipped','rejected') OR delay_seconds NOT BETWEEN 0 AND 86400 OR length(error_code)>100 THEN RAISE EXCEPTION 'invalid_job_result'; END IF;
 UPDATE editorial.publication_jobs SET cache_state=cache_status,notification_state=notification_status,last_error=error_code,next_attempt_at=now()+make_interval(secs=>delay_seconds),lease_token=NULL,lease_until=NULL WHERE publication_jobs.event_id=finish_publication_job.event_id AND lease_token=lease AND cache_state<>'superseded' RETURNING publication_jobs.event_id INTO updated;
 IF updated IS NOT NULL AND cache_status='confirmed' AND notification_status<>'pending' THEN UPDATE editorial.publication_events SET processed_at=coalesce(processed_at,now()) WHERE id=updated; END IF;
 RETURN updated IS NOT NULL;
END $$;
CREATE FUNCTION editorial.due_publication_jobs(site text,test_mode boolean) RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
 SELECT j.event_id FROM editorial.publication_jobs j JOIN editorial.publication_events e ON e.id=j.event_id JOIN editorial.articles a ON a.id=e.article_id WHERE a.site_id=site AND a.is_test=test_mode AND j.cache_state<>'superseded' AND (j.cache_state='pending' OR j.notification_state='pending') AND j.next_attempt_at<=now() AND (j.lease_until IS NULL OR j.lease_until<now()) ORDER BY e.created_at,e.id LIMIT 10
$$;
--> statement-breakpoint
CREATE FUNCTION editorial.set_redirect(token text,source text,destination text,code integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p editorial.principals; target text=destination; next_target text; seen text[]=ARRAY[source];
BEGIN
 p=editorial.actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p.site_id));
 IF source !~ '^/[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$' OR source ~ '^/(api|go|redaksjon)(/|$)' OR code NOT IN (301,410) THEN RAISE EXCEPTION 'invalid_redirect' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM editorial.articles WHERE site_id=p.site_id AND '/'||namespace||'/'||slug=source AND status='published') THEN RAISE EXCEPTION 'cannot_redirect_live_article' USING ERRCODE='23514'; END IF;
 IF code=301 THEN
  LOOP
   IF target=ANY(seen) OR array_length(seen,1)>50 THEN RAISE EXCEPTION 'redirect_cycle' USING ERRCODE='23514'; END IF;
   seen=array_append(seen,target);
   SELECT to_path INTO next_target FROM editorial.redirects WHERE site_id=p.site_id AND from_path=target AND status=301;
   EXIT WHEN next_target IS NULL;
   target=next_target;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM editorial.articles WHERE site_id=p.site_id AND is_test=p.is_test AND '/'||namespace||'/'||slug=target AND status='published' AND published_revision_id IS NOT NULL) THEN RAISE EXCEPTION 'redirect_target_not_published' USING ERRCODE='23514'; END IF;
 ELSE
  IF destination IS NOT NULL THEN RAISE EXCEPTION 'invalid_tombstone' USING ERRCODE='23514'; END IF;
  target=NULL;
 END IF;
 INSERT INTO editorial.redirects(site_id,from_path,to_path,status,is_test) VALUES(p.site_id,source,target,code,p.is_test) ON CONFLICT(site_id,from_path) DO UPDATE SET to_path=excluded.to_path,status=excluded.status,is_test=excluded.is_test;
 UPDATE editorial.redirects SET to_path=target,status=code WHERE site_id=p.site_id AND to_path=source;
END $$;
