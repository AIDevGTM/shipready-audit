
-- Reduce the anonymous role to what the product actually needs.
--
-- 1) public.audits_public was created WITHOUT security_invoker, so it ran with
--    the view owner's privileges and bypassed the base table's deny-all RLS,
--    letting the publishable anon key enumerate the whole audits history.
-- 2) Share links still load a single audit through a security-definer
--    accessor keyed on the audit uuid, which cannot be listed in bulk.
-- 3) public.skill_exports no longer accepts anonymous direct writes or reads;
--    a validated accessor records exports and a count accessor feeds the
--    public "used by" counter.

-- 1) The public view now respects the caller's RLS instead of the owner's.
CREATE OR REPLACE VIEW public.audits_public
  WITH (security_invoker = true) AS
  SELECT id, url, overall_score, working_well, categories, created_at
  FROM public.audits;

-- 2) Single-row accessor for shared audits (?audit=<id>).
CREATE OR REPLACE FUNCTION public.get_public_audit(p_id uuid)
RETURNS TABLE (
  id uuid,
  url text,
  overall_score integer,
  working_well jsonb,
  categories jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT a.id, a.url, a.overall_score, a.working_well, a.categories, a.created_at
  FROM public.audits a
  WHERE a.id = p_id
$$;

REVOKE ALL ON FUNCTION public.get_public_audit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_audit(uuid) TO anon, authenticated, service_role;

-- 3a) Drop the wide-open skill_exports policies.
DROP POLICY IF EXISTS "Anyone can insert skill exports" ON public.skill_exports;
DROP POLICY IF EXISTS "Skill exports are publicly readable" ON public.skill_exports;

CREATE POLICY "No anonymous inserts on skill_exports"
  ON public.skill_exports FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct select on skill_exports"
  ON public.skill_exports FOR SELECT USING (false);

-- 3b) Validated, bounded accessor for recording an export. Requires a real
--     audit_id, so the per-audit rate-limit trigger always applies and the
--     audit_id IS NULL bypass is gone. Runs as the owner, so RLS does not
--     block it; the BEFORE INSERT trigger still enforces the volume caps.
CREATE OR REPLACE FUNCTION public.track_skill_export(
  p_audit_id uuid,
  p_mode text,
  p_format text,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_audit_id IS NULL THEN
    RAISE EXCEPTION 'audit_id is required' USING ERRCODE = '22004';
  END IF;
  IF p_mode NOT IN ('generic', 'personalized') THEN
    RAISE EXCEPTION 'invalid mode' USING ERRCODE = '22023';
  END IF;
  IF p_format NOT IN ('claude_skill', 'system_prompt', 'cursor_rules') THEN
    RAISE EXCEPTION 'invalid format' USING ERRCODE = '22023';
  END IF;
  IF p_action NOT IN ('copy', 'download') THEN
    RAISE EXCEPTION 'invalid action' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.skill_exports (audit_id, mode, format, action)
  VALUES (p_audit_id, p_mode, p_format, p_action);
END;
$$;

REVOKE ALL ON FUNCTION public.track_skill_export(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_skill_export(uuid, text, text, text) TO anon, authenticated, service_role;

-- 3c) Aggregate count accessor for the "used by" counter (no row read).
CREATE OR REPLACE FUNCTION public.skill_export_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT count(*) FROM public.skill_exports
$$;

REVOKE ALL ON FUNCTION public.skill_export_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.skill_export_count() TO anon, authenticated, service_role;
