-- ============================================================
-- Supabase Database Migration: public.app_versions
-- Copy and paste this directly into Supabase SQL Editor and click RUN.
-- ============================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name TEXT UNIQUE NOT NULL,
  version_code INTEGER UNIQUE NOT NULL,
  apk_url TEXT NOT NULL,
  release_notes TEXT,
  minimum_supported_version INTEGER NOT NULL DEFAULT 1,
  is_mandatory BOOLEAN DEFAULT false,
  released_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist for existing tables
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS version_name TEXT;
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS version_code INTEGER;
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS apk_url TEXT;
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS release_notes TEXT;
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS minimum_supported_version INTEGER DEFAULT 1;
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;
ALTER TABLE public.app_versions ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ DEFAULT now();

-- Ensure unique constraint on version_code for ON CONFLICT upsert
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_versions_version_code_key'
  ) THEN
    ALTER TABLE public.app_versions ADD CONSTRAINT app_versions_version_code_key UNIQUE (version_code);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- 3. Read policy for everyone (anonymous & authenticated)
DROP POLICY IF EXISTS app_versions_read_policy ON public.app_versions;
CREATE POLICY app_versions_read_policy ON public.app_versions
  FOR SELECT TO authenticated, anon USING (true);

-- 4. Service role / authenticated write policy
DROP POLICY IF EXISTS app_versions_write_policy ON public.app_versions;
CREATE POLICY app_versions_write_policy ON public.app_versions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_app_versions_code ON public.app_versions(version_code DESC);
CREATE INDEX IF NOT EXISTS idx_app_versions_name ON public.app_versions(version_name);

-- 6. Insert / Upsert Latest Release (Ready to RUN)
-- NOTE: You can paste your Google Drive link here (e.g. 'https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing')
-- The app automatically converts it into a direct download link!
INSERT INTO public.app_versions (
  version_name,
  version_code,
  apk_url,
  release_notes,
  is_mandatory,
  released_at
) VALUES (
  '1.0.1',
  2,
  'https://drive.usercontent.google.com/download?id=1B0x1MiD-RtjPaq6BpbMsHvQX_vOn4O6E&export=download&confirm=t',
  '• Improved audio caching and smoother transitions\n• Background update detection & Settings update hub\n• UI performance fixes and bug enhancements',
  false,
  now()
) 
ON CONFLICT (version_code) DO UPDATE SET
  version_name = EXCLUDED.version_name,
  apk_url = EXCLUDED.apk_url,
  release_notes = EXCLUDED.release_notes,
  is_mandatory = EXCLUDED.is_mandatory,
  released_at = now();

