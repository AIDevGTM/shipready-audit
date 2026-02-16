
-- Drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.audits_public;

CREATE VIEW public.audits_public
WITH (security_invoker = true)
AS
SELECT
  id,
  url,
  overall_score,
  working_well,
  categories,
  created_at
FROM public.audits;

-- Add a permissive SELECT policy on the audits base table so the
-- security-invoker view can read rows for anon/authenticated users
CREATE POLICY "Allow public read via audits_public view"
ON public.audits
FOR SELECT
TO anon, authenticated
USING (true);
