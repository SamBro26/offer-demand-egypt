ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'building_land';
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'agricultural_land';
CREATE TYPE public.transaction_type AS ENUM ('sale', 'rent');

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS transaction_type public.transaction_type NOT NULL DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.listing_ratings (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, user_id)
);
GRANT SELECT ON public.listing_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_ratings TO authenticated;
GRANT ALL ON public.listing_ratings TO service_role;
ALTER TABLE public.listing_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings readable" ON public.listing_ratings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rate as self" ON public.listing_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own rating" ON public.listing_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own rating" ON public.listing_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.listing_likes (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, user_id)
);
GRANT SELECT ON public.listing_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.listing_likes TO authenticated;
GRANT ALL ON public.listing_likes TO service_role;
ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable" ON public.listing_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "like as self" ON public.listing_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "unlike own" ON public.listing_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_listing_idx ON public.messages(listing_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "send as self" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "listing photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'listing-photos');
CREATE POLICY "listing photos upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
