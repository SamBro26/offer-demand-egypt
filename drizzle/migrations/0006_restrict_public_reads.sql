DROP POLICY IF EXISTS "likes readable" ON public.listing_likes;
CREATE POLICY "own likes readable" ON public.listing_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ratings readable" ON public.listing_ratings;
CREATE POLICY "own ratings readable" ON public.listing_ratings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Own profile readable" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.listing_like_count(_listing_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.listing_likes l JOIN public.listings x ON x.id = l.listing_id
  WHERE l.listing_id = _listing_id AND x.status = 'published'
$$;
CREATE OR REPLACE FUNCTION public.listing_rating_stats(_listing_id uuid)
RETURNS TABLE(avg_stars numeric, rating_count integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(avg(r.stars),0)::numeric, count(*)::int FROM public.listing_ratings r JOIN public.listings x ON x.id = r.listing_id
  WHERE r.listing_id = _listing_id AND x.status = 'published'
$$;
GRANT EXECUTE ON FUNCTION public.listing_like_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listing_rating_stats(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "listing photos public read" ON storage.objects;
CREATE POLICY "listing photos readable when published or owned" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'listing-photos' AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.listings l WHERE l.status = 'published' AND name = ANY(l.images))
  )
);