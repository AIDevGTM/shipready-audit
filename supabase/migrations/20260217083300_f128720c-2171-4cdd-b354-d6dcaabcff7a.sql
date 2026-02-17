
-- 1. Fix audits table: remove the overly permissive SELECT policy that exposes IP addresses
-- The audits_public view (which excludes ip_address) is the intended public access path
DROP POLICY IF EXISTS "Allow public read via audits_public view" ON public.audits;

-- 2. Restrict skill_exports SELECT: replace wide-open read with no direct SELECT
-- The app only needs INSERT + count queries (done via head:true which uses the INSERT policy context)
DROP POLICY IF EXISTS "Skill exports are publicly readable" ON public.skill_exports;

-- Re-create as a restrictive deny-all SELECT so the count still works via service role only
-- The client-side count uses .select("*", { count: "exact", head: true }) which returns count without rows
-- This works because the anon key can still get the count header even without SELECT rows access
-- Actually, we need SELECT for the count to work. Let's keep SELECT but it's non-sensitive analytics data.
-- Instead, let's just mark it as acceptable and keep the policy.

-- Actually the skill_exports data (format, mode, action) is basic analytics, not PII.
-- The real fix is just the audits IP exposure. Let's restore skill_exports SELECT.
CREATE POLICY "Skill exports are publicly readable"
  ON public.skill_exports
  FOR SELECT
  USING (true);
