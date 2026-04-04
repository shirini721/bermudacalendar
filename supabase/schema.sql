-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- FAMILY GROUPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- EVENTS TABLE
-- No auth.users dependency — created_by is nullable
-- =============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  location TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('school', 'sports', 'medical', 'vacation', 'birthday', 'other')),
  color TEXT,
  created_by UUID,  -- nullable; no FK to auth.users
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  recurrence_rule TEXT,
  rsvp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_events_family_group ON public.events(family_group_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events(start_at);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- Disabled — app uses service role key server-side
-- and is protected by the app-level password gate
-- =============================================
ALTER TABLE public.family_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- =============================================
-- SEED: Create your family group
-- Run this once, then copy the UUID into FAMILY_GROUP_ID in .env.local
-- =============================================
-- INSERT INTO public.family_groups (name) VALUES ('Our Family') RETURNING id;
