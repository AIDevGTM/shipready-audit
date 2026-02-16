
-- Add a rate-limiting trigger to prevent abuse of skill_exports inserts
-- Since we don't have IP tracking on this table, we'll add a unique constraint
-- to prevent duplicate entries within a short window, and limit insert volume per audit_id

-- Add unique constraint: same audit_id + format + mode can only be inserted once per 60 seconds
-- We'll use a trigger-based approach since we can't do time-windowed unique constraints natively

CREATE OR REPLACE FUNCTION public.rate_limit_skill_exports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Limit: max 30 inserts per audit_id per hour (prevents spam for a single audit)
  IF NEW.audit_id IS NOT NULL THEN
    SELECT count(*) INTO recent_count
    FROM public.skill_exports
    WHERE audit_id = NEW.audit_id
      AND created_at > now() - interval '1 hour';
    
    IF recent_count >= 30 THEN
      RAISE EXCEPTION 'Rate limit exceeded for this audit' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Prevent exact duplicate within 10 seconds
  IF EXISTS (
    SELECT 1 FROM public.skill_exports
    WHERE audit_id IS NOT DISTINCT FROM NEW.audit_id
      AND format = NEW.format
      AND mode = NEW.mode
      AND action = NEW.action
      AND created_at > now() - interval '10 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate export detected' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rate_limit_skill_exports
  BEFORE INSERT ON public.skill_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.rate_limit_skill_exports();
