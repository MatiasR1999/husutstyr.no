CREATE FUNCTION editorial.retry_publication_job(token text,event_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
BEGIN
 PERFORM editorial.publication_status(token,event_id);
 UPDATE editorial.publication_jobs SET next_attempt_at=now(),notification_state=CASE WHEN notification_state='rejected' THEN 'pending' ELSE notification_state END,last_error=NULL WHERE publication_jobs.event_id=retry_publication_job.event_id AND cache_state<>'superseded' AND (cache_state='pending' OR notification_state IN ('pending','rejected')) AND (lease_until IS NULL OR lease_until<now());
END $$;
REVOKE ALL ON FUNCTION editorial.retry_publication_job(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION editorial.retry_publication_job(text,uuid) TO seo_editor_service;
