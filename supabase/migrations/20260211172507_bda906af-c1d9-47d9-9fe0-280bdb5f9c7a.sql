
-- Create a public view that excludes ip_address
CREATE VIEW public.audits_public
WITH (security_invoker = on) AS
  SELECT id, url, overall_score, working_well, categories, created_at
  FROM public.audits;

-- Drop the old permissive SELECT policy
DROP POLICY "Audits are publicly readable" ON public.audits;

-- Replace with a restrictive SELECT that blocks direct table access
CREATE POLICY "No direct select on audits"
  ON public.audits FOR SELECT
  USING (false);
