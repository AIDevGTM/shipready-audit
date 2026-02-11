
-- Create audits table (public, no auth required)
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  overall_score INTEGER NOT NULL DEFAULT 0,
  working_well JSONB NOT NULL DEFAULT '[]'::jsonb,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read audits (public tool, no auth)
CREATE POLICY "Audits are publicly readable"
  ON public.audits FOR SELECT
  USING (true);

-- Only service role (edge functions) can insert
CREATE POLICY "Service role can insert audits"
  ON public.audits FOR INSERT
  WITH CHECK (true);

-- Create index on URL for lookups
CREATE INDEX idx_audits_url ON public.audits (url);
CREATE INDEX idx_audits_created_at ON public.audits (created_at DESC);
