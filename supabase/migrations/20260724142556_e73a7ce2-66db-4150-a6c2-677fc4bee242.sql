
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bouquets
CREATE TABLE public.bouquets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Bouquet',
  wrapping TEXT NOT NULL DEFAULT 'ivory',
  ribbon_material TEXT NOT NULL DEFAULT 'silk',
  ribbon_color TEXT NOT NULL DEFAULT 'emerald',
  flowers JSONB NOT NULL DEFAULT '[]'::jsonb,
  fillers JSONB NOT NULL DEFAULT '[]'::jsonb,
  accessories JSONB NOT NULL DEFAULT '[]'::jsonb,
  message TEXT,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bouquets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bouquets TO authenticated;
GRANT ALL ON public.bouquets TO service_role;
ALTER TABLE public.bouquets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public bouquets viewable by all" ON public.bouquets FOR SELECT USING (is_public = true);
CREATE POLICY "owners view own bouquets" ON public.bouquets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owners insert own bouquets" ON public.bouquets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update own bouquets" ON public.bouquets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners delete own bouquets" ON public.bouquets FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX bouquets_public_idx ON public.bouquets(is_public, created_at DESC);
CREATE INDEX bouquets_user_idx ON public.bouquets(user_id, created_at DESC);

-- Likes
CREATE TABLE public.bouquet_likes (
  bouquet_id UUID NOT NULL REFERENCES public.bouquets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bouquet_id, user_id)
);
GRANT SELECT ON public.bouquet_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.bouquet_likes TO authenticated;
GRANT ALL ON public.bouquet_likes TO service_role;
ALTER TABLE public.bouquet_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable by all" ON public.bouquet_likes FOR SELECT USING (true);
CREATE POLICY "users like as self" ON public.bouquet_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users unlike own" ON public.bouquet_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER bouquets_updated_at BEFORE UPDATE ON public.bouquets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Likes count trigger
CREATE OR REPLACE FUNCTION public.update_bouquet_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.bouquets SET likes_count = likes_count + 1 WHERE id = NEW.bouquet_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.bouquets SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.bouquet_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER bouquet_likes_count_trg AFTER INSERT OR DELETE ON public.bouquet_likes FOR EACH ROW EXECUTE FUNCTION public.update_bouquet_likes_count();
