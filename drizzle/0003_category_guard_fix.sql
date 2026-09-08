CREATE OR REPLACE FUNCTION editorial.category_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=editorial,pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM sites WHERE id=NEW.site_id AND NEW.slug=ANY(reserved_routes)) THEN RAISE EXCEPTION 'reserved_category'; END IF;
 IF TG_OP='UPDATE' AND (OLD.slug,OLD.site_id,OLD.locale) IS DISTINCT FROM (NEW.slug,NEW.site_id,NEW.locale) THEN RAISE EXCEPTION 'immutable_category_route'; END IF;
 RETURN NEW;
END $$;
