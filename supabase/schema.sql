-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- FAMILY GROUPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  avatar_url TEXT,
  family_group_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- EVENTS TABLE
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
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  recurrence_rule TEXT,
  rsvp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- EVENT RSVPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_family_group ON public.profiles(family_group_id);
CREATE INDEX IF NOT EXISTS idx_events_family_group ON public.events(family_group_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_family_groups_updated_at
  BEFORE UPDATE ON public.family_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Family Groups policies
CREATE POLICY "Users can view their own family group"
  ON public.family_groups FOR SELECT
  USING (
    id IN (
      SELECT family_group_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create family groups"
  ON public.family_groups FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can update their family group"
  ON public.family_groups FOR UPDATE
  USING (
    id IN (
      SELECT family_group_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Allow reading family groups by invite code (for joining)
CREATE POLICY "Anyone can read family groups by invite code"
  ON public.family_groups FOR SELECT
  USING (TRUE);

-- Profiles policies
CREATE POLICY "Users can view profiles in their family group"
  ON public.profiles FOR SELECT
  USING (
    family_group_id IN (
      SELECT family_group_id FROM public.profiles WHERE id = auth.uid()
    )
    OR id = auth.uid()
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Events policies
CREATE POLICY "Users can view events in their family group"
  ON public.events FOR SELECT
  USING (
    family_group_id IN (
      SELECT family_group_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create events in their family group"
  ON public.events FOR INSERT
  WITH CHECK (
    family_group_id IN (
      SELECT family_group_id FROM public.profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update events in their family group"
  ON public.events FOR UPDATE
  USING (
    family_group_id IN (
      SELECT family_group_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events in their family group"
  ON public.events FOR DELETE
  USING (
    family_group_id IN (
      SELECT family_group_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Event RSVPs policies
CREATE POLICY "Users can view RSVPs for their family group events"
  ON public.event_rsvps FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.profiles p ON p.family_group_id = e.family_group_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own RSVPs"
  ON public.event_rsvps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_rsvps;
