-- =========================================================================
-- عقارك بنفسك — Phase 1 foundational schema
-- Modules: (1) locations  (2) identity/roles  (3) marketplace listings
-- =========================================================================

-- ---------- 1. LOCATIONS -------------------------------------------------
CREATE TABLE public.governorates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name_ar     text NOT NULL,
  name_en     text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.governorates TO anon, authenticated;
GRANT ALL ON public.governorates TO service_role;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Governorates are public" ON public.governorates FOR SELECT USING (true);

CREATE TABLE public.districts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_id  uuid NOT NULL REFERENCES public.governorates(id) ON DELETE CASCADE,
  name_ar         text NOT NULL,
  name_en         text NOT NULL,
  sort_order      int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (governorate_id, name_ar)
);
CREATE INDEX districts_governorate_idx ON public.districts(governorate_id);
GRANT SELECT ON public.districts TO anon, authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Districts are public" ON public.districts FOR SELECT USING (true);

-- ---------- 2. IDENTITY & ROLES -----------------------------------------
CREATE TYPE public.account_type AS ENUM ('individual', 'agency');
CREATE TYPE public.app_role     AS ENUM ('individual', 'agency', 'admin');

CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY,
  full_name     text,
  phone         text,
  account_type  public.account_type NOT NULL DEFAULT 'individual',
  agency_name   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL,
  role     public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ---------- 3. MARKETPLACE LISTINGS --------------------------------------
-- One table, two markets: kind = 'offer' (العرض) | 'request' (الطلب)
CREATE TYPE public.listing_kind   AS ENUM ('offer', 'request');
CREATE TYPE public.property_type  AS ENUM ('apartment', 'villa', 'duplex', 'studio', 'land', 'shop', 'office', 'chalet');
CREATE TYPE public.listing_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid,
  kind            public.listing_kind NOT NULL,
  status          public.listing_status NOT NULL DEFAULT 'published',
  title           text NOT NULL,
  description     text,
  property_type   public.property_type NOT NULL DEFAULT 'apartment',
  governorate_id  uuid NOT NULL REFERENCES public.governorates(id),
  district_id     uuid REFERENCES public.districts(id),
  -- free-text location used for governorates with no seeded districts yet
  district_label  text,
  price           numeric(14,2),
  budget_min      numeric(14,2),
  budget_max      numeric(14,2),
  area_sqm        int,
  bedrooms        int,
  bathrooms       int,
  image_url       text,
  posted_as       public.account_type NOT NULL DEFAULT 'individual',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_kind_status_idx ON public.listings(kind, status, created_at DESC);
CREATE INDEX listings_location_idx    ON public.listings(governorate_id, district_id);

GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published listings are public" ON public.listings FOR SELECT USING (status = 'published');
CREATE POLICY "Owners read own listings"  ON public.listings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert own listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update own listings" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete own listings" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER listings_touch BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- SEED: 27 Egyptian governorates -------------------------------
INSERT INTO public.governorates (code, name_ar, name_en, sort_order) VALUES
  ('CAI','القاهرة','Cairo',1),
  ('GIZ','الجيزة','Giza',2),
  ('ALX','الإسكندرية','Alexandria',3),
  ('DK','الدقهلية','Dakahlia',4),
  ('BH','البحيرة','Beheira',5),
  ('SHR','الشرقية','Sharqia',6),
  ('GH','الغربية','Gharbia',7),
  ('MNF','المنوفية','Monufia',8),
  ('KFS','كفر الشيخ','Kafr El Sheikh',9),
  ('QLY','القليوبية','Qalyubia',10),
  ('DMT','دمياط','Damietta',11),
  ('PTS','بورسعيد','Port Said',12),
  ('ISM','الإسماعيلية','Ismailia',13),
  ('SUZ','السويس','Suez',14),
  ('FYM','الفيوم','Faiyum',15),
  ('BNS','بني سويف','Beni Suef',16),
  ('MN','المنيا','Minya',17),
  ('AST','أسيوط','Asyut',18),
  ('SHG','سوهاج','Sohag',19),
  ('QNA','قنا','Qena',20),
  ('LUX','الأقصر','Luxor',21),
  ('ASN','أسوان','Aswan',22),
  ('RSS','البحر الأحمر','Red Sea',23),
  ('WAD','الوادي الجديد','New Valley',24),
  ('MAT','مطروح','Matrouh',25),
  ('NSI','شمال سيناء','North Sinai',26),
  ('SSI','جنوب سيناء','South Sinai',27);

-- ---------- SEED: districts for 4 preview governorates -------------------
INSERT INTO public.districts (governorate_id, name_ar, name_en, sort_order)
SELECT g.id, d.name_ar, d.name_en, d.ord
FROM public.governorates g
JOIN (VALUES
  ('CAI','مدينة نصر','Nasr City',1),
  ('CAI','مصر الجديدة','Heliopolis',2),
  ('CAI','المعادي','Maadi',3),
  ('CAI','المقطم','Mokattam',4),
  ('CAI','الزمالك','Zamalek',5),
  ('CAI','وسط البلد','Downtown',6),
  ('CAI','شبرا','Shubra',7),
  ('CAI','حلوان','Helwan',8),
  ('CAI','التجمع الخامس','Fifth Settlement',9),
  ('CAI','مدينة العبور','Obour City',10),
  ('CAI','عين شمس','Ain Shams',11),
  ('CAI','المرج','El Marg',12),
  ('CAI','السيدة زينب','Sayeda Zeinab',13),
  ('CAI','الزيتون','El Zeitoun',14),
  ('CAI','البساتين','El Basatin',15),
  ('GIZ','المهندسين','Mohandessin',1),
  ('GIZ','الدقي','Dokki',2),
  ('GIZ','العجوزة','Agouza',3),
  ('GIZ','الهرم','Haram',4),
  ('GIZ','فيصل','Faisal',5),
  ('GIZ','6 أكتوبر','6th of October',6),
  ('GIZ','الشيخ زايد','Sheikh Zayed',7),
  ('GIZ','إمبابة','Imbaba',8),
  ('GIZ','بولاق الدكرور','Boulaq El Dakrour',9),
  ('GIZ','البدرشين','El Badrashin',10),
  ('GIZ','الصف','El Saff',11),
  ('GIZ','أوسيم','Oseem',12),
  ('GIZ','كرداسة','Kerdasa',13),
  ('ALX','سموحة','Smouha',1),
  ('ALX','سيدي جابر','Sidi Gaber',2),
  ('ALX','ميامي','Miami',3),
  ('ALX','العجمي','Agami',4),
  ('ALX','المنتزه','Montaza',5),
  ('ALX','محرم بك','Moharram Bek',6),
  ('ALX','العصافرة','Asafra',7),
  ('ALX','بولكلي','Bolkly',8),
  ('ALX','اللبان','El Labban',9),
  ('ALX','برج العرب','Borg El Arab',10),
  ('ALX','أبو قير','Abu Qir',11),
  ('ALX','كامب شيزار','Camp Caesar',12),
  ('DK','المنصورة','Mansoura',1),
  ('DK','طلخا','Talkha',2),
  ('DK','ميت غمر','Mit Ghamr',3),
  ('DK','دكرنس','Dekernes',4),
  ('DK','أجا','Aga',5),
  ('DK','السنبلاوين','El Senbellawein',6),
  ('DK','بلقاس','Belqas',7),
  ('DK','منية النصر','Meniet El Nasr',8),
  ('DK','شربين','Sherbin',9),
  ('DK','المطرية','El Matareya',10),
  ('DK','بني عبيد','Bani Ubaid',11),
  ('DK','تمي الأمديد','Tami El Amdid',12)
) AS d(gov_code, name_ar, name_en, ord) ON d.gov_code = g.code;

-- ---------- SEED: demo listings for preview ------------------------------
INSERT INTO public.listings (kind, title, description, property_type, governorate_id, district_id, price, area_sqm, bedrooms, bathrooms, posted_as)
SELECT 'offer', 'شقة 3 غرف بالمهندسين', 'شقة مشطبة سوبر لوكس بموقع متميز', 'apartment', g.id, d.id, 4200000, 120, 3, 2, 'individual'
FROM public.governorates g JOIN public.districts d ON d.governorate_id = g.id
WHERE g.code = 'GIZ' AND d.name_ar = 'المهندسين';

INSERT INTO public.listings (kind, title, description, property_type, governorate_id, district_id, price, area_sqm, bedrooms, bathrooms, posted_as)
SELECT 'offer', 'فيلا مستقلة على البحر', 'فيلا بحديقة خاصة وإطلالة مباشرة', 'villa', g.id, d.id, 12500000, 350, 5, 4, 'agency'
FROM public.governorates g JOIN public.districts d ON d.governorate_id = g.id
WHERE g.code = 'ALX' AND d.name_ar = 'سموحة';

INSERT INTO public.listings (kind, title, description, property_type, governorate_id, district_id, price, area_sqm, bedrooms, bathrooms, posted_as)
SELECT 'offer', 'شقة تمليك بمدينة نصر', 'دور خامس بأسانسير، قريبة من الخدمات', 'apartment', g.id, d.id, 2650000, 145, 3, 2, 'individual'
FROM public.governorates g JOIN public.districts d ON d.governorate_id = g.id
WHERE g.code = 'CAI' AND d.name_ar = 'مدينة نصر';

INSERT INTO public.listings (kind, title, description, property_type, governorate_id, district_id, budget_min, budget_max, area_sqm, bedrooms, posted_as)
SELECT 'request', 'مطلوب شقة إيجار بالمعادي', 'مطلوب شقة مفروشة لعائلة صغيرة', 'apartment', g.id, d.id, 800000, 1500000, 100, 2, 'individual'
FROM public.governorates g JOIN public.districts d ON d.governorate_id = g.id
WHERE g.code = 'CAI' AND d.name_ar = 'المعادي';

INSERT INTO public.listings (kind, title, description, property_type, governorate_id, district_id, budget_min, budget_max, area_sqm, bedrooms, posted_as)
SELECT 'request', 'مطلوب فيلا بالشيخ زايد', 'مطلوب فيلا بحديقة لا تقل عن 300 متر', 'villa', g.id, d.id, 9000000, 14000000, 300, 4, 'agency'
FROM public.governorates g JOIN public.districts d ON d.governorate_id = g.id
WHERE g.code = 'GIZ' AND d.name_ar = 'الشيخ زايد';

INSERT INTO public.listings (kind, title, description, property_type, governorate_id, district_id, budget_min, budget_max, area_sqm, bedrooms, posted_as)
SELECT 'request', 'مطلوب شقة بالمنصورة', 'مطلوب شقة قريبة من جامعة المنصورة', 'apartment', g.id, d.id, 700000, 1200000, 110, 3, 'individual'
FROM public.governorates g JOIN public.districts d ON d.governorate_id = g.id
WHERE g.code = 'DK' AND d.name_ar = 'المنصورة';
