-- Prevent temporary relations or user-defined functions from shadowing trusted objects.
DO $$
DECLARE function_identity text;
BEGIN
 FOR function_identity IN SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='editorial' LOOP
  EXECUTE 'ALTER FUNCTION ' || function_identity || ' SET search_path = pg_catalog, editorial, pg_temp';
 END LOOP;
END $$;
