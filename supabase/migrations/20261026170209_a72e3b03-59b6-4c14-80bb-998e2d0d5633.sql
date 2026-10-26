CREATE TABLE public.governorates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name_ar text NOT NULL, name_en text NOT NULL, sort_order int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.governorates TO anon, authenticated;
GRANT ALL ON public.governorates TO service_role;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Governorates are public" ON public.governorates FOR SELECT USING (true);

CREATE TABLE public.districts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), governorate_id uuid NOT NULL REFERENCES public.governorates(id) ON DELETE CASCADE, name_ar text NOT NULL, name_en text NOT NULL, sort_order int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (governorate_id, name_ar));
CREATE INDEX districts_governorate_idx ON public.districts(governorate_id);
GRANT SELECT ON public.districts TO anon, authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Districts are public" ON public.districts FOR SELECT USING (true);

CREATE TYPE public.account_type AS ENUM ('individual', 'agency');
CREATE TYPE public.app_role AS ENUM ('individual', 'agency', 'admin');

CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE (user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.user_bans (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, banned_by uuid NOT NULL, reason text NOT NULL DEFAULT 'مخالفة سياسات المنصة', created_at timestamptz NOT NULL DEFAULT now(), lifted_at timestamptz, lifted_by uuid);
GRANT ALL ON public.user_bans TO service_role;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX user_bans_one_active_idx ON public.user_bans(user_id) WHERE lifted_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = _user_id AND lifted_at IS NULL)
$$;
REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated, service_role;

CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, full_name text, phone text, account_type public.account_type NOT NULL DEFAULT 'individual', agency_name text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile readable" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Banned users cannot change profiles" ON public.profiles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_banned(auth.uid()));
CREATE POLICY "Banned users cannot update profiles" ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_banned(auth.uid())) WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE TYPE public.listing_kind AS ENUM ('offer', 'request');
CREATE TYPE public.property_type AS ENUM ('apartment','villa','duplex','studio','land','shop','office','chalet','building_land','agricultural_land');
CREATE TYPE public.listing_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.transaction_type AS ENUM ('sale', 'rent');

CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid, kind public.listing_kind NOT NULL,
  status public.listing_status NOT NULL DEFAULT 'published', title text NOT NULL, description text,
  property_type public.property_type NOT NULL DEFAULT 'apartment',
  transaction_type public.transaction_type NOT NULL DEFAULT 'sale',
  governorate_id uuid NOT NULL REFERENCES public.governorates(id), district_id uuid REFERENCES public.districts(id),
  district_label text, price numeric(14,2), budget_min numeric(14,2), budget_max numeric(14,2),
  area_sqm int, bedrooms int, bathrooms int, image_url text, phone text, images text[] NOT NULL DEFAULT '{}',
  posted_as public.account_type NOT NULL DEFAULT 'individual',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX listings_kind_status_idx ON public.listings(kind, status, created_at DESC);
CREATE INDEX listings_location_idx ON public.listings(governorate_id, district_id);
GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published listings are public" ON public.listings FOR SELECT USING (status = 'published');
CREATE POLICY "Owners read own listings" ON public.listings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert own listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update own listings" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete own listings" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Admins manage all listings" ON public.listings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Banned users cannot access listings" ON public.listings AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_banned(auth.uid())) WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER listings_touch BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.listing_ratings (listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE, user_id uuid NOT NULL, stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (listing_id, user_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_ratings TO authenticated;
GRANT ALL ON public.listing_ratings TO service_role;
ALTER TABLE public.listing_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ratings readable" ON public.listing_ratings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rate as self" ON public.listing_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own rating" ON public.listing_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own rating" ON public.listing_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Banned users cannot access ratings" ON public.listing_ratings AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_banned(auth.uid())) WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE TABLE public.listing_likes (listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE, user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (listing_id, user_id));
GRANT SELECT, INSERT, DELETE ON public.listing_likes TO authenticated;
GRANT ALL ON public.listing_likes TO service_role;
ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own likes readable" ON public.listing_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "like as self" ON public.listing_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "unlike own" ON public.listing_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Banned users cannot access likes" ON public.listing_likes AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_banned(auth.uid())) WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE OR REPLACE FUNCTION public.listing_like_count(_listing_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.listing_likes l JOIN public.listings x ON x.id = l.listing_id WHERE l.listing_id = _listing_id AND x.status = 'published'
$$;
CREATE OR REPLACE FUNCTION public.listing_rating_stats(_listing_id uuid)
RETURNS TABLE(avg_stars numeric, rating_count integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(avg(r.stars),0)::numeric, count(*)::int FROM public.listing_ratings r JOIN public.listings x ON x.id = r.listing_id WHERE r.listing_id = _listing_id AND x.status = 'published'
$$;
GRANT EXECUTE ON FUNCTION public.listing_like_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listing_rating_stats(uuid) TO anon, authenticated;

CREATE TABLE public.messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE, sender_id uuid NOT NULL, recipient_id uuid, body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000), read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX messages_listing_idx ON public.messages(listing_id, created_at);
CREATE INDEX messages_participants_created_idx ON public.messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX messages_recipient_unread_idx ON public.messages(recipient_id, created_at DESC) WHERE read_at IS NULL;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_listing_conversation(_listing_id uuid, _first_user uuid, _second_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.messages WHERE listing_id = _listing_id AND ((sender_id = _first_user AND recipient_id = _second_user) OR (sender_id = _second_user AND recipient_id = _first_user)))
$$;
REVOKE ALL ON FUNCTION public.has_listing_conversation(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_listing_conversation(uuid, uuid, uuid) TO authenticated;

CREATE POLICY "participants read" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "recipients mark messages read" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY "send to listing participant" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND recipient_id IS NOT NULL AND recipient_id <> sender_id AND (
    EXISTS (SELECT 1 FROM public.listings WHERE listings.id = messages.listing_id AND listings.owner_id = messages.recipient_id AND listings.status = 'published')
    OR public.has_listing_conversation(messages.listing_id, messages.sender_id, messages.recipient_id)));
CREATE POLICY "Banned users cannot access messages" ON public.messages AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_banned(auth.uid())) WITH CHECK (NOT public.is_banned(auth.uid()));

CREATE TYPE public.listing_report_status AS ENUM ('pending', 'reviewed', 'actioned', 'dismissed');
CREATE TABLE public.listing_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE, reporter_id uuid NOT NULL, status public.listing_report_status NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid, UNIQUE (listing_id, reporter_id));
GRANT SELECT, INSERT, UPDATE ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX listing_reports_status_created_idx ON public.listing_reports(status, created_at DESC);
CREATE POLICY "Users create own listing reports" ON public.listing_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users read own listing reports" ON public.listing_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "Admins read all listing reports" ON public.listing_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update listing reports" ON public.listing_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.system_notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000), created_by uuid NOT NULL, recipient_id uuid, created_at timestamptz NOT NULL DEFAULT now());
COMMENT ON COLUMN public.system_notifications.recipient_id IS 'NULL = broadcast to all users; otherwise targeted to this user';
CREATE INDEX system_notifications_recipient_idx ON public.system_notifications (recipient_id, created_at DESC);
GRANT SELECT, INSERT ON public.system_notifications TO authenticated;
GRANT ALL ON public.system_notifications TO service_role;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own or broadcast notifications" ON public.system_notifications FOR SELECT TO authenticated USING (recipient_id IS NULL OR recipient_id = auth.uid());
CREATE POLICY "Admins send notifications" ON public.system_notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE TABLE public.support_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL, sender_email text, body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users send own support messages" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND NOT public.is_banned(auth.uid()));
CREATE POLICY "Users read own support messages" ON public.support_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "listing photos upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "listing photos delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "listing photos readable when published or owned" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'listing-photos' AND ((storage.foldername(name))[1] = (select auth.uid()::text) OR EXISTS (SELECT 1 FROM public.listings l WHERE l.status = 'published' AND name = ANY(l.images))));