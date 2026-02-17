
-- Recreate audits_public view WITHOUT security_invoker so it can bypass
-- the base table's restrictive RLS (USING false) while still hiding ip_address.
-- This is safe because the view itself only exposes non-sensitive columns.
DROP VIEW IF EXISTS public.audits_public;

CREATE VIEW public.audits_public AS
  SELECT id, url, overall_score, working_well, categories, created_at
  FROM public.audits;
