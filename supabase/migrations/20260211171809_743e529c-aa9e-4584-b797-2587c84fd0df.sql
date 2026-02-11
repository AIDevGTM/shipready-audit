
-- Add IP tracking column for rate limiting
ALTER TABLE public.audits ADD COLUMN ip_address text;

-- Create index for efficient rate limit queries
CREATE INDEX idx_audits_ip_created ON public.audits (ip_address, created_at DESC);
