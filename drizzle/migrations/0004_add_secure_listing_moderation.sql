CREATE TYPE public.listing_report_status AS ENUM ('pending', 'reviewed', 'actioned', 'dismissed');

CREATE TABLE public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  status public.listing_report_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  UNIQUE (listing_id, reporter_id)
);
GRANT SELECT, INSERT, UPDATE ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX listing_reports_status_created_idx
  ON public.listing_reports(status, created_at DESC);

CREATE POLICY "Users create own listing reports"
ON public.listing_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users read own listing reports"
ON public.listing_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins read all listing reports"
ON public.listing_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update listing reports"
ON public.listing_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text NOT NULL DEFAULT 'مخالفة سياسات المنصة',
  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  lifted_by uuid
);
GRANT ALL ON public.user_bans TO service_role;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX user_bans_one_active_idx
  ON public.user_bans(user_id)
  WHERE lifted_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_bans
    WHERE user_id = _user_id
      AND lifted_at IS NULL
  )
$$;
REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated, service_role;

CREATE POLICY "Admins manage all listings"
ON public.listings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Banned users cannot access listings"
ON public.listings
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (NOT public.is_banned(auth.uid()))
WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE POLICY "Banned users cannot access messages"
ON public.messages
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (NOT public.is_banned(auth.uid()))
WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE POLICY "Banned users cannot access likes"
ON public.listing_likes
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (NOT public.is_banned(auth.uid()))
WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE POLICY "Banned users cannot access ratings"
ON public.listing_ratings
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (NOT public.is_banned(auth.uid()))
WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE POLICY "Banned users cannot change profiles"
ON public.profiles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE POLICY "Banned users cannot update profiles"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (NOT public.is_banned(auth.uid()))
WITH CHECK (NOT public.is_banned(auth.uid()));