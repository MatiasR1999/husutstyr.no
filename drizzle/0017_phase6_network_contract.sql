CREATE FUNCTION editorial.network_anchor(value text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT lower(regexp_replace(btrim(normalize(value,NFKC)),'[[:space:]]+',' ','g')) $$;
CREATE FUNCTION editorial.network_config_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE peer jsonb;
BEGIN
 IF TG_OP='UPDATE' AND NEW.network_registry IS NOT DISTINCT FROM OLD.network_registry AND NEW.network_origin=OLD.network_origin AND NEW.network_niche=OLD.network_niche THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.network_registry) IS DISTINCT FROM 'object' OR jsonb_typeof(NEW.network_registry->'sites') IS DISTINCT FROM 'array' OR (NEW.network_registry->>'version')!~'^[1-9][0-9]*$' OR NOT NEW.network_registry ? 'version' THEN RAISE EXCEPTION 'invalid_network_registry'; END IF;
 IF TG_OP='UPDATE' AND jsonb_array_length(OLD.network_registry->'sites')>0 AND (NEW.network_registry->>'version')::int<=(OLD.network_registry->>'version')::int THEN RAISE EXCEPTION 'network_registry_version_must_increase'; END IF;
 IF jsonb_array_length(NEW.network_registry->'sites')>100 OR (SELECT count(DISTINCT p->>'id') FROM jsonb_array_elements(NEW.network_registry->'sites') p)<>jsonb_array_length(NEW.network_registry->'sites') OR (SELECT count(DISTINCT p->>'origin') FROM jsonb_array_elements(NEW.network_registry->'sites') p)<>jsonb_array_length(NEW.network_registry->'sites') THEN RAISE EXCEPTION 'duplicate_network_peer'; END IF;
 FOR peer IN SELECT value FROM jsonb_array_elements(NEW.network_registry->'sites') LOOP
  IF peer->>'id' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR peer->>'origin' !~ '^https://[a-z0-9.-]+(:[0-9]+)?$' OR peer->>'origin'=NEW.network_origin OR peer->>'niche' IS DISTINCT FROM NEW.network_niche OR jsonb_typeof(peer->'topics') IS DISTINCT FROM 'array' OR jsonb_array_length(peer->'topics')=0 OR NOT (peer ?& ARRAY['id','origin','niche','topics']) THEN RAISE EXCEPTION 'invalid_network_peer'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER network_config_guard BEFORE INSERT OR UPDATE ON editorial.sites FOR EACH ROW EXECUTE FUNCTION editorial.network_config_guard();
--> statement-breakpoint
CREATE FUNCTION editorial.network_link_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE a articles; r revisions; s sites; peer jsonb; paragraph text; owner_article uuid;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'network_approval_is_immutable'; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(OLD)-'enabled') IS DISTINCT FROM (to_jsonb(NEW)-'enabled') THEN RAISE EXCEPTION 'network_approval_is_immutable'; END IF;
  IF NOT NEW.enabled THEN RETURN NEW; END IF;
 END IF;
 SELECT * INTO STRICT a FROM articles WHERE id=NEW.article_id AND site_id=NEW.site_id AND is_test=NEW.is_test AND kind IN ('article','news','review') FOR UPDATE;
 SELECT * INTO STRICT r FROM revisions WHERE id=NEW.revision_id AND article_id=a.id;
 SELECT * INTO STRICT s FROM sites WHERE id=a.site_id;
 IF NOT EXISTS(SELECT 1 FROM principals p WHERE p.id=NEW.approved_by AND p.site_id=a.site_id AND p.is_test=a.is_test AND p.role='editor' AND p.enabled) OR NOT EXISTS(SELECT 1 FROM approvals ap WHERE ap.revision_id=r.id AND ap.content_hash=r.content_hash) THEN RAISE EXCEPTION 'network_requires_human_revision_approval'; END IF;
 SELECT value INTO STRICT peer FROM jsonb_array_elements(s.network_registry->'sites') WHERE value->>'id'=NEW.peer_id;
 IF NEW.registry_version IS DISTINCT FROM (s.network_registry->>'version')::int OR peer->>'niche' IS DISTINCT FROM s.network_niche OR peer->>'origin'=s.network_origin OR NOT peer->'topics' ? NEW.topic_slug OR NOT EXISTS(SELECT 1 FROM revision_topics rt JOIN topics t ON t.id=rt.topic_id WHERE rt.revision_id=r.id AND t.site_id=a.site_id AND t.slug=NEW.topic_slug) THEN RAISE EXCEPTION 'unrelated_network_destination'; END IF;
 IF NEW.destination !~ '^https://[^/@[:space:]\\?#]+(/[^[:space:]\\?#]*)?$' OR substring(NEW.destination from '^https://[^/]+') IS DISTINCT FROM peer->>'origin' OR length(btrim(NEW.justification))<30 OR (NOT a.is_test AND NEW.justification LIKE '%TODO:%') THEN RAISE EXCEPTION 'invalid_network_destination'; END IF;
 paragraph=r.payload->'blocks'->NEW.block_index->>'text';
 IF NEW.block_index NOT BETWEEN 0 AND 99 OR r.payload->'blocks'->NEW.block_index->>'type' IS DISTINCT FROM 'paragraph' OR length(NEW.anchor) NOT BETWEEN 3 AND 120 OR NEW.anchor ~ '[[:cntrl:]]' OR paragraph IS NULL OR (length(paragraph)-length(replace(paragraph,NEW.anchor,'')))<>length(NEW.anchor) THEN RAISE EXCEPTION 'network_requires_exact_body_context'; END IF;
 NEW.normalized_anchor=network_anchor(NEW.anchor);
 IF length(NEW.normalized_anchor)=0 OR (SELECT count(*) FROM network_links WHERE revision_id=r.id AND id<>NEW.id)>=2 THEN RAISE EXCEPTION 'network_link_limit'; END IF;
 INSERT INTO network_anchor_claims(site_id,anchor,article_id) VALUES(a.site_id,NEW.normalized_anchor,a.id) ON CONFLICT(site_id,anchor) DO UPDATE SET article_id=network_anchor_claims.article_id RETURNING article_id INTO owner_article;
 IF owner_article<>a.id THEN RAISE EXCEPTION 'network_anchor_already_used'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER network_link_guard BEFORE INSERT OR UPDATE OR DELETE ON editorial.network_links FOR EACH ROW EXECUTE FUNCTION editorial.network_link_guard();
--> statement-breakpoint
CREATE FUNCTION editorial.register_network_link(token text,input jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p principals; result uuid;
BEGIN
 p=actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(input) IS DISTINCT FROM 'object' OR input->>'placement' IS DISTINCT FROM 'body' OR input->>'relationship' IS DISTINCT FROM 'editorial' OR EXISTS(SELECT 1 FROM jsonb_object_keys(input) k WHERE k<>ALL(ARRAY['articleId','revisionId','blockIndex','anchor','peerId','destination','topicSlug','justification','placement','relationship','registryVersion'])) THEN RAISE EXCEPTION 'unsupported_network_placement'; END IF;
 INSERT INTO network_links(site_id,article_id,revision_id,block_index,anchor,normalized_anchor,peer_id,destination,topic_slug,justification,registry_version,approved_by,is_test) VALUES(p.site_id,(input->>'articleId')::uuid,(input->>'revisionId')::uuid,(input->>'blockIndex')::int,input->>'anchor','',input->>'peerId',input->>'destination',input->>'topicSlug',input->>'justification',(input->>'registryVersion')::int,p.id,p.is_test) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION editorial.set_network_link_enabled(token text,link_id uuid,value boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE p principals;
BEGIN
 p=actor(token);
 IF p.role<>'editor' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 UPDATE network_links SET enabled=value WHERE id=link_id AND site_id=p.site_id AND is_test=p.is_test;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown_network_link'; END IF;
END $$;
--> statement-breakpoint
CREATE VIEW editorial.public_network_links WITH(security_barrier=true) AS
 SELECT l.id,l.site_id,l.is_test,l.article_id,l.revision_id,l.block_index,l.anchor,l.peer_id,l.destination,l.topic_slug,l.registry_version
 FROM editorial.network_links l JOIN editorial.published_articles a ON a.id=l.article_id AND a.revision_id=l.revision_id AND a.site_id=l.site_id AND a.is_test=l.is_test
 JOIN editorial.principals p ON p.id=l.approved_by AND p.site_id=l.site_id AND p.is_test=l.is_test AND p.enabled AND p.role='editor'
 JOIN editorial.sites s ON s.id=l.site_id AND (s.network_registry->>'version')::int=l.registry_version
 WHERE l.enabled AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.network_registry->'sites') peer WHERE peer->>'id'=l.peer_id AND peer->>'origin'=substring(l.destination from '^https://[^/]+') AND peer->>'niche'=s.network_niche AND peer->'topics' ? l.topic_slug);
REVOKE ALL ON editorial.network_links,editorial.network_anchor_claims FROM PUBLIC,seo_public_reader,seo_editor_service;
REVOKE ALL ON FUNCTION editorial.network_anchor(text),editorial.network_config_guard(),editorial.network_link_guard(),editorial.register_network_link(text,jsonb),editorial.set_network_link_enabled(text,uuid,boolean) FROM PUBLIC;
GRANT SELECT ON editorial.public_network_links TO seo_public_reader;
GRANT EXECUTE ON FUNCTION editorial.register_network_link(text,jsonb),editorial.set_network_link_enabled(text,uuid,boolean) TO seo_editor_service;
