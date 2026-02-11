
-- Drop the overly permissive insert policy
DROP POLICY "Service role can insert audits" ON public.audits;

-- Create a restrictive insert policy (only service role bypasses RLS, anon cannot insert)
CREATE POLICY "No anonymous inserts"
  ON public.audits FOR INSERT
  WITH CHECK (false);
