-- Recreate audits_public view WITHOUT security_invoker so it bypasses base table RLS
DROP VIEW IF EXISTS public.audits_public;

CREATE VIEW public.audits_public AS
  SELECT id, url, overall_score, working_well, categories, created_at
  FROM public.audits;