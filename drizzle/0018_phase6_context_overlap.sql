CREATE FUNCTION editorial.network_overlap_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,editorial,pg_temp AS $$
DECLARE paragraph text;
BEGIN
 SELECT payload->'blocks'->NEW.block_index->>'text' INTO STRICT paragraph FROM revisions WHERE id=NEW.revision_id;
 IF EXISTS(SELECT 1 FROM network_links l WHERE l.id<>NEW.id AND l.revision_id=NEW.revision_id AND l.block_index=NEW.block_index AND int4range(position(l.anchor in paragraph),position(l.anchor in paragraph)+length(l.anchor),'[)') && int4range(position(NEW.anchor in paragraph),position(NEW.anchor in paragraph)+length(NEW.anchor),'[)')) THEN RAISE EXCEPTION 'overlapping_network_anchors'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER network_overlap_guard BEFORE INSERT OR UPDATE ON editorial.network_links FOR EACH ROW EXECUTE FUNCTION editorial.network_overlap_guard();
REVOKE ALL ON FUNCTION editorial.network_overlap_guard() FROM PUBLIC;
