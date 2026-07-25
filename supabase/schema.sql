-- Supabase Database Schema Migration for Aruvi Play

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Helper Functions
-- ==========================================

-- Normalizes song titles for deduplication and matching
CREATE OR REPLACE FUNCTION public.normalize_song_title(title text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  IF title IS NULL THEN
    RETURN '';
  END IF;
  normalized := lower(title);
  -- Remove anything inside brackets () and []
  normalized := regexp_replace(normalized, '\([^)]*\)', '', 'g');
  normalized := regexp_replace(normalized, '\[[^\]]*\]', '', 'g');
  -- Remove trailing suffixes after - or |
  normalized := split_part(normalized, ' - ', 1);
  normalized := split_part(normalized, ' | ', 1);
  -- Keep alphanumeric and tamil characters
  normalized := regexp_replace(normalized, '[^a-z0-9\u0B80-\u0BFF\s]', '', 'g');
  -- Collapse whitespace
  normalized := regexp_replace(normalized, '\s+', ' ', 'g');
  RETURN trim(normalized);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- 2. Table Definitions
-- ==========================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'system',
  is_owner BOOLEAN DEFAULT false,
  initial_likes_imported BOOLEAN DEFAULT false,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  guest_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT profiles_display_name_length CHECK (
    display_name IS NULL
    OR char_length(trim(display_name)) BETWEEN 2 AND 40
  )
);

-- Migrations for existing profiles table instances
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guest_created_at TIMESTAMPTZ;

-- songs
CREATE TABLE IF NOT EXISTS public.songs (
  id TEXT PRIMARY KEY, -- Saavn ID or custom hash
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  artist TEXT,
  artists TEXT[], -- Postgres text array
  primary_artist TEXT,
  music_director TEXT,
  album TEXT,
  movie TEXT,
  language TEXT,
  genre TEXT,
  mood TEXT,
  energy TEXT,
  artwork_url TEXT,
  duration_seconds INTEGER,
  release_year INTEGER,
  source_type TEXT DEFAULT 'online',
  source_id TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_songs_normalized_title ON public.songs(normalized_title);
CREATE INDEX IF NOT EXISTS idx_songs_primary_artist ON public.songs(primary_artist);
CREATE INDEX IF NOT EXISTS idx_songs_music_director ON public.songs(music_director);
CREATE INDEX IF NOT EXISTS idx_songs_album ON public.songs(album);
CREATE INDEX IF NOT EXISTS idx_songs_language ON public.songs(language);
CREATE INDEX IF NOT EXISTS idx_songs_source_id ON public.songs(source_id);

-- liked_songs
CREATE TABLE IF NOT EXISTS public.liked_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_song UNIQUE (user_id, song_id)
);

-- playlists
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- playlist_songs
CREATE TABLE IF NOT EXISTS public.playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_playlist_song UNIQUE (playlist_id, song_id)
);

-- listening_history
CREATE TABLE IF NOT EXISTS public.listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT now(),
  completed_percentage REAL DEFAULT 0.0,
  source_type TEXT,
  source_id TEXT,
  device_id TEXT
);

-- playback_sessions
CREATE TABLE IF NOT EXISTS public.playback_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_song_id TEXT REFERENCES public.songs(id) ON DELETE SET NULL,
  position_seconds REAL DEFAULT 0.0,
  is_playing BOOLEAN DEFAULT false,
  repeat_mode TEXT DEFAULT 'off',
  shuffle_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- user_queues
CREATE TABLE IF NOT EXISTS public.user_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_index INTEGER DEFAULT -1,
  source_type TEXT,
  source_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- queue_items
CREATE TABLE IF NOT EXISTS public.queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.user_queues(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  queue_type TEXT DEFAULT 'manual',
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- search_history
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  selected_song_id TEXT REFERENCES public.songs(id) ON DELETE SET NULL,
  searched_at TIMESTAMPTZ DEFAULT now()
);



-- app_versions
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

-- playback_errors
CREATE TABLE IF NOT EXISTS public.playback_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  song_id TEXT REFERENCES public.songs(id) ON DELETE SET NULL,
  error_code TEXT,
  error_message TEXT,
  source_url TEXT,
  app_version TEXT,
  device_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- ==========================================
-- Music Rooms
-- ==========================================

-- rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  current_song_id TEXT REFERENCES public.songs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);

-- room_members
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_room_member UNIQUE (room_id, user_id)
);

-- room_queue
CREATE TABLE IF NOT EXISTS public.room_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_room_queue_song UNIQUE (room_id, song_id)
);

-- room_actions (synchronized playback events)
CREATE TABLE IF NOT EXISTS public.room_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'play', 'pause', 'seek', 'next', 'prev', 'add_song', 'remove_song'
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ==========================================
-- 3. Row Level Security Policies (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_actions ENABLE ROW LEVEL SECURITY;

-- Helper macro: non-anonymous authenticated user
-- (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE

-- Rooms: Only non-anonymous authenticated users can see active rooms and manage their own
DROP POLICY IF EXISTS rooms_read_policy ON public.rooms;
CREATE POLICY rooms_read_policy ON public.rooms
  FOR SELECT TO authenticated
  USING (is_active = true AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);

DROP POLICY IF EXISTS rooms_write_policy ON public.rooms;
CREATE POLICY rooms_write_policy ON public.rooms
  FOR ALL TO authenticated
  USING (auth.uid() = host_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK (auth.uid() = host_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);

-- Room Members: Non-anonymous authenticated users can join/view rooms
DROP POLICY IF EXISTS room_members_policy ON public.room_members;
CREATE POLICY room_members_policy ON public.room_members
  FOR ALL TO authenticated
  USING ((auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK ((auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);

-- Room Queue: Non-anonymous authenticated members of the room can manage queue
DROP POLICY IF EXISTS room_queue_policy ON public.room_queue;
CREATE POLICY room_queue_policy ON public.room_queue
  FOR ALL TO authenticated
  USING (
    (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE AND
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_queue.room_id AND user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE AND
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_queue.room_id AND user_id = auth.uid())
  );

-- Room Actions: Non-anonymous authenticated members can post actions
DROP POLICY IF EXISTS room_actions_policy ON public.room_actions;
CREATE POLICY room_actions_policy ON public.room_actions
  FOR ALL TO authenticated
  USING (
    (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE AND
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_actions.room_id AND user_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE AND
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_actions.room_id AND user_id = auth.uid())
  );


-- Profiles: Safe SELECT policies and column-level privileges to hide phone/email from unrelated users
REVOKE SELECT ON public.profiles FROM public, authenticated, anon;
GRANT SELECT (id, display_name, avatar_url, preferred_language, theme, is_owner, initial_likes_imported, is_guest, guest_created_at, created_at, updated_at, last_active_at) 
  ON public.profiles TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Allow select check for rows (PostgreSQL column-level security will filter out restricted columns)
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
  FOR SELECT TO authenticated, anon USING (true);

-- Allow updates ONLY on user's own profile row
DROP POLICY IF EXISTS profiles_write_policy ON public.profiles;
CREATE POLICY profiles_write_policy ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create security-definer view to allow authenticated users to fetch their own full private profile safely
CREATE OR REPLACE VIEW public.my_profile AS
  SELECT * FROM public.profiles WHERE id = auth.uid();
GRANT SELECT ON public.my_profile TO authenticated;

-- Avatars storage bucket setup and policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Insert Own Avatar" ON storage.objects;
CREATE POLICY "Insert Own Avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%'));

DROP POLICY IF EXISTS "Update Own Avatar" ON storage.objects;
CREATE POLICY "Update Own Avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%')) WITH CHECK (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%'));

DROP POLICY IF EXISTS "Delete Own Avatar" ON storage.objects;
CREATE POLICY "Delete Own Avatar" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '/%'));

-- Songs: Read only for everyone, write only for authenticated (dynamic additions)
DROP POLICY IF EXISTS songs_read_policy ON public.songs;
CREATE POLICY songs_read_policy ON public.songs
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS songs_insert_policy ON public.songs;
CREATE POLICY songs_insert_policy ON public.songs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Liked Songs: Non-anonymous registered users can read, insert, delete their own liked songs
DROP POLICY IF EXISTS liked_songs_user_policy ON public.liked_songs;
CREATE POLICY liked_songs_user_policy ON public.liked_songs
  FOR ALL TO authenticated USING (auth.uid() = user_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK (auth.uid() = user_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);

-- Playlists: Private playlists only by non-anonymous owner, public by anyone authenticated
DROP POLICY IF EXISTS playlists_read_policy ON public.playlists;
CREATE POLICY playlists_read_policy ON public.playlists
  FOR SELECT TO authenticated USING ((auth.uid() = user_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE) OR is_public = true);

DROP POLICY IF EXISTS playlists_write_policy ON public.playlists;
CREATE POLICY playlists_write_policy ON public.playlists
  FOR ALL TO authenticated USING (auth.uid() = user_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK (auth.uid() = user_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);

-- Playlist Songs: Linked to playlist access
DROP POLICY IF EXISTS playlist_songs_policy ON public.playlist_songs;
CREATE POLICY playlist_songs_policy ON public.playlist_songs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND (user_id = auth.uid() OR is_public = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid()));

-- Listening History: Only non-anonymous registered owner can view or write
DROP POLICY IF EXISTS history_user_policy ON public.listening_history;
CREATE POLICY history_user_policy ON public.listening_history
  FOR ALL TO authenticated USING (auth.uid() = user_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK (auth.uid() = user_id AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);

-- Playback Sessions: Only owner can view or write
DROP POLICY IF EXISTS playback_session_user_policy ON public.playback_sessions;
CREATE POLICY playback_session_user_policy ON public.playback_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User Queues & items: Only owner
DROP POLICY IF EXISTS user_queues_policy ON public.user_queues;
CREATE POLICY user_queues_policy ON public.user_queues
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS queue_items_policy ON public.queue_items;
CREATE POLICY queue_items_policy ON public.queue_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_queues WHERE id = queue_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_queues WHERE id = queue_id AND user_id = auth.uid()));

-- Search History: Only owner
DROP POLICY IF EXISTS search_history_user_policy ON public.search_history;
CREATE POLICY search_history_user_policy ON public.search_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- App versions: Read-only for authenticated and anon, no write
DROP POLICY IF EXISTS app_versions_read_policy ON public.app_versions;
CREATE POLICY app_versions_read_policy ON public.app_versions
  FOR SELECT TO authenticated, anon USING (true);

-- Playback Errors: Write-only for users, no read except service_role
DROP POLICY IF EXISTS playback_errors_insert ON public.playback_errors;
CREATE POLICY playback_errors_insert ON public.playback_errors
  FOR INSERT TO authenticated, anon WITH CHECK (true);


-- ==========================================
-- 4. Triggers & Functions
-- ==========================================

-- Provision profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_is_anon boolean := false;
  v_guest_num integer;
  v_display text;
BEGIN
  v_is_anon := COALESCE((NEW.raw_app_meta_data->>'provider' = 'anonymous'), false) 
               OR COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false);

  IF v_is_anon THEN
    v_guest_num := floor(1000 + random() * 9000)::integer;
    v_display := 'Guest ' || v_guest_num;
  ELSE
    v_display := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', 'Aruvi User');
  END IF;

  INSERT INTO public.profiles (
    id,
    phone,
    email,
    display_name,
    avatar_url,
    preferred_language,
    theme,
    is_owner,
    initial_likes_imported,
    is_guest,
    guest_created_at
  ) VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    v_display,
    NEW.raw_user_meta_data->>'avatar_url',
    'en',
    'system',
    CASE WHEN NEW.phone = '+917806885868' AND NOT v_is_anon THEN true ELSE false END,
    false,
    v_is_anon,
    CASE WHEN v_is_anon THEN now() ELSE null END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Block is_owner updates from client side
CREATE OR REPLACE FUNCTION public.check_profile_owner_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_owner IS DISTINCT FROM OLD.is_owner AND (auth.jwt() ->> 'role' <> 'service_role') THEN
    NEW.is_owner := OLD.is_owner;
  END IF;
  IF NEW.initial_likes_imported IS DISTINCT FROM OLD.initial_likes_imported AND NEW.initial_likes_imported = false THEN
    NEW.initial_likes_imported := OLD.initial_likes_imported;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_owner_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_owner_change();


-- ==========================================
-- 5. Owner Liked Songs Migration RPC
-- ==========================================

CREATE OR REPLACE FUNCTION public.import_owner_likes(songs_json jsonb)
RETURNS void AS $$
DECLARE
  song_item jsonb;
  v_song_id text;
  v_normalized_title text;
  v_owner_id uuid;
BEGIN
  -- Verify the current authenticated user is the owner
  SELECT id INTO v_owner_id 
    FROM public.profiles 
   WHERE id = auth.uid() 
     AND phone = '+917806885868' 
     AND initial_likes_imported = false;
     
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized or migration already completed';
  END IF;

  -- Loop through each song item in the JSON array
  FOR song_item IN SELECT * FROM jsonb_array_elements(songs_json) LOOP
    v_normalized_title := public.normalize_song_title(song_item->>'title');
    v_song_id := 'migrated:' || md5(v_normalized_title || '|' || lower(song_item->>'artist'));

    -- 1. Insert or update the song metadata
    INSERT INTO public.songs (
      id,
      title,
      normalized_title,
      artist,
      album,
      source_type,
      source_id,
      source_url,
      created_at,
      updated_at
    ) VALUES (
      v_song_id,
      song_item->>'title',
      v_normalized_title,
      song_item->>'artist',
      song_item->>'album',
      'online',
      '',
      '',
      now(),
      now()
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Insert the liked song association
    INSERT INTO public.liked_songs (
      id,
      user_id,
      song_id,
      liked_at
    ) VALUES (
      gen_random_uuid(),
      v_owner_id,
      v_song_id,
      now()
    ) ON CONFLICT (user_id, song_id) DO NOTHING;
  END LOOP;

  -- 3. Mark the migration as completed
  UPDATE public.profiles SET initial_likes_imported = true, updated_at = now() WHERE id = v_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
