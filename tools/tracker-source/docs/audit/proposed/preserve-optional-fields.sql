-- PROPOSAL ONLY: not executed, requires separate approval and staging tests.
-- Prevent older clients from omitting existing newer-format JSON collections.
BEGIN;
CREATE OR REPLACE FUNCTION public.tracker_preserve_optional_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE field_name text;
BEGIN
  FOREACH field_name IN ARRAY ARRAY['additionalLoans','provisions','reconciliations'] LOOP
    IF jsonb_typeof(OLD.data -> field_name) = 'array'
       AND jsonb_array_length(OLD.data -> field_name) > 0
       AND (NOT (NEW.data ? field_name)
            OR jsonb_typeof(NEW.data -> field_name) IS DISTINCT FROM 'array') THEN
      RAISE EXCEPTION 'Update all tracker clients before saving: existing % must be preserved', field_name
        USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF OLD.data -> 'settings' ? 'emiPreviousMonth'
     AND NOT (coalesce(NEW.data -> 'settings', '{}'::jsonb) ? 'emiPreviousMonth') THEN
    RAISE EXCEPTION 'Update tracker client before saving EMI timing' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tracker_preserve_optional_fields ON public.tracker_plans;
CREATE TRIGGER tracker_preserve_optional_fields BEFORE UPDATE OF data ON public.tracker_plans
FOR EACH ROW EXECUTE FUNCTION public.tracker_preserve_optional_fields();
COMMIT;
-- Rollback proposal (only removes the guard; NEVER financial data):
-- DROP TRIGGER tracker_preserve_optional_fields ON public.tracker_plans;
-- DROP FUNCTION public.tracker_preserve_optional_fields();
