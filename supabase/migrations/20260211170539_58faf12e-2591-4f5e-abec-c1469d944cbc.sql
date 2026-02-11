
CREATE TABLE public.skill_exports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id uuid REFERENCES public.audits(id),
  mode text NOT NULL CHECK (mode IN ('generic', 'personalized')),
  format text NOT NULL CHECK (format IN ('claude_skill', 'system_prompt', 'cursor_rules')),
  action text NOT NULL CHECK (action IN ('copy', 'download')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_exports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (no auth required, matches app pattern)
CREATE POLICY "Anyone can insert skill exports"
  ON public.skill_exports
  FOR INSERT
  WITH CHECK (true);

-- Allow reading for analytics
CREATE POLICY "Skill exports are publicly readable"
  ON public.skill_exports
  FOR SELECT
  USING (true);
