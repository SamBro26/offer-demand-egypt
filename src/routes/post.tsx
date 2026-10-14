import { useEffect, useState } from "react";
import { POST_LOGIN_MESSAGE } from "@/lib/use-post-gate";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { BottomNav } from "@/components/layout/BottomNav";
import { LocationFilter } from "@/components/location/LocationFilter";
import { MarketTabs } from "@/components/market/MarketTabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import {
  PHOTO_BUCKET,
  propertyTypeLabels,
  transactionTypeLabels,
  wizardPropertyTypes,
  type ListingKind,
  type TransactionType,
  type WizardPropertyType,
} from "@/lib/listings";
import { emptyLocation, type LocationSelection } from "@/lib/locations";
import { useAccountType } from "@/lib/use-account-type";

type PostSearch = { gov?: string | undefined; district?: string | undefined; label?: string | undefined };

export const Route = createFileRoute("/post")({
  validateSearch: (search: Record<string, unknown>): PostSearch => ({
    gov: typeof search["gov"] === "string" ? search["gov"] : undefined,
    district: typeof search["district"] === "string" ? search["district"] : undefined,
    label: typeof search["label"] === "string" ? search["label"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "أضِف إعلانك — عقارك بنفسك" },
      { name: "description", content: "انشر عقارك المعروض أو طلب البحث مجانًا في خطوات بسيطة." },
      { property: "og:title", content: "أضِف إعلانك — عقارك بنفسك" },
      { property: "og:description", content: "خطوات بسيطة لنشر عقار معروض أو طلب بحث في أي محافظة مصرية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});

const MAX_PHOTOS = 8;
const detailsSchema = z.object({
  price: z.number().positive("السعر يجب أن يكون رقمًا موجبًا").max(10_000_000_000).nullable(),
  description: z.string().trim().max(2000, "الوصف 2000 حرف كحد أقصى"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(\+?20|0)?1[0125]\d{8}$/.test(v.replace(/[\s-]/g, "")), "رقم موبايل مصري غير صالح"),
});

/** Transaction labels per market: the demand flow reads "شراء" (buying) instead of "بيع". */
const transactionLabels: Record<ListingKind, Record<TransactionType, string>> = {
  offer: transactionTypeLabels,
  request: { sale: "شراء", rent: "إيجار" },
};

const chip = (active: boolean) =>
  `rounded-xl py-3 text-[13px] transition-all ${
    active ? "bg-brand font-bold text-primary-foreground shadow-brand" : "bg-glass-strong font-semibold text-ink-soft outline-1 outline-glass-edge"
  }`;
const input =
  "w-full rounded-xl border border-glass-edge bg-glass-strong px-3.5 py-3 text-[13px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-faint focus:border-brand";

/** Three-step posting wizard: location → type → details & photos. */
function PostPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useSession();
  const [accountType] = useAccountType();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<ListingKind>("offer");
  const [location, setLocation] = useState<LocationSelection>({
    ...emptyLocation,
    governorateId: search.gov ?? null,
    districtId: search.district ?? null,
    districtLabel: search.label ?? "",
  });
  const [propertyType, setPropertyType] = useState<WizardPropertyType | null>(null);
  const [transaction, setTransaction] = useState<TransactionType | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const photosRequired = kind === "offer";

  // Direct visits while signed out: alert and send to sign-in before any step is filled.
  useEffect(() => {
    if (loading || user) return;
    toast.error(POST_LOGIN_MESSAGE);
    navigate({ to: "/auth", search: { next: "/post" }, replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="relative min-h-screen">
        <AmbientBackground />
        <p className="relative mx-auto max-w-[430px] px-4 pt-10 text-center text-[13px] text-ink-soft">
          {loading ? "جارٍ التحقق…" : POST_LOGIN_MESSAGE}
        </p>
      </div>
    );
  }

  const addPhotos = (files: FileList | null) => {
    const valid = Array.from(files ?? []).filter((f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024);
    if (valid.length < (files?.length ?? 0)) toast("بعض الملفات تم تجاهلها (صور فقط، حتى 5 ميجابايت)");
    setPhotos((current) => [...current, ...valid].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    if (!user || !propertyType || !transaction || !location.governorateId) return;
    const parsed = detailsSchema.safeParse({ price: price ? Number(price) : null, description, phone });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    if (photosRequired && photos.length === 0) { toast.error("أضِف صورة واحدة على الأقل للعقار المعروض"); return; }

    setBusy(true);
    try {
      const paths: string[] = [];
      for (const file of photos) {
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
        if (error) throw error;
        paths.push(path);
      }
      const typeLabel = propertyTypeLabels[propertyType];
      const transLabel = transactionLabels[kind][transaction];
      const title = kind === "offer" ? `${typeLabel} لل${transLabel}` : `مطلوب ${typeLabel} لل${transLabel}`;
      const { data, error } = await supabase
        .from("listings")
        .insert({
          owner_id: user.id,
          kind,
          status: "published",
          title,
          description: parsed.data.description || null,
          property_type: propertyType,
          transaction_type: transaction,
          governorate_id: location.governorateId!,
          district_id: location.districtId,
          district_label: location.districtId ? null : location.districtLabel.trim(),
          price: parsed.data.price,
          phone: parsed.data.phone || null,
          images: paths,
          posted_as: accountType,
        })
        .select("id")
        .single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("تم نشر إعلانك مجانًا");
      navigate({ to: "/listings/$id", params: { id: data.id } });
    } catch (err) {
      console.error(err);
      toast.error("تعذّر نشر الإعلان، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <div className="relative mx-auto max-w-[430px] px-4 pb-32 pt-5">
        <div className="flex items-center justify-between">
          {step === 1 ? (
            <Link to="/" className="text-[12px] font-semibold text-brand">رجوع</Link>
          ) : (
            <button type="button" onClick={() => setStep((s) => (s - 1) as 1 | 2)} className="text-[12px] font-semibold text-brand">
              السابق
            </button>
          )}
          <span className="text-[11px] font-medium text-ink-faint">الخطوة {step} من 3</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 rounded-full ${n <= step ? "bg-brand" : "bg-mist"}`} />
          ))}
        </div>

        <h1 className="mt-3 font-display text-[22px] font-extrabold text-ink">أضِف إعلانك</h1>
        <p className="mt-1 text-[12px] text-ink-soft">النشر مجاني 100% بدون أي اشتراكات.</p>

        {step === 1 ? (
          <>
            <div className="mt-4 rounded-3xl glass-panel p-4">
              <MarketTabs
                value={kind}
                onChange={setKind}
                labels={{ offer: "عرض عقار", request: "بحث عن عقار" }}
              />
            </div>
            <div className="mt-4">
              <LocationFilter
                value={location}
                onChange={setLocation}
                districtOptional
                actionLabel="التالي"
                onAction={() => setStep(2)}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <section className="mt-4 rounded-3xl glass-panel p-4">
            <h2 className="font-display text-[15px] font-bold text-ink">نوع العقار <span className="text-like">*</span></h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {wizardPropertyTypes.map((type) => (
                <button key={type} type="button" onClick={() => setPropertyType(type)} className={chip(propertyType === type)}>
                  {propertyTypeLabels[type]}
                </button>
              ))}
            </div>
            <h2 className="mt-5 font-display text-[15px] font-bold text-ink">نوع المعاملة <span className="text-like">*</span></h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["sale", "rent"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTransaction(t)} className={chip(transaction === t)}>
                  {transactionLabels[kind][t]}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!propertyType || !transaction}
              onClick={() => setStep(3)}
              className="mt-5 w-full rounded-xl bg-brand py-3.5 text-[14px] font-bold text-primary-foreground shadow-brand disabled:opacity-40"
            >
              التالي
            </button>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="mt-4 space-y-4 rounded-3xl glass-panel p-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-ink-soft">
                {kind === "offer" ? "السعر" : "الميزانية"} (ج.م){transaction === "rent" ? " شهريًا" : ""} — اختياري
              </span>
              <input className={input} inputMode="numeric" dir="ltr" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="مثال: 1500000" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-ink-soft">الوصف — اختياري</span>
              <textarea className={`${input} min-h-24`} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="المساحة، الدور، التشطيب، المميزات…" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-ink-soft">رقم الهاتف (للاتصال وواتساب) — اختياري</span>
              <input className={input} type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
            </label>

            <div>
              <span className="mb-1.5 block text-[11px] font-semibold text-ink-soft">
                الصور {photosRequired ? <span className="text-like">* مطلوبة للعقار المعروض</span> : "— اختياري"}
              </span>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative">
                    <img src={URL.createObjectURL(file)} alt="" className="aspect-square w-full rounded-xl object-cover" />
                    <button
                      type="button"
                      aria-label="حذف الصورة"
                      onClick={() => setPhotos((c) => c.filter((_, i) => i !== index))}
                      className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-[11px] text-primary-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS ? (
                  <label className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-dashed border-brand/50 bg-glass-strong text-[22px] text-brand">
                    ＋
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                  </label>
                ) : null}
              </div>
            </div>

            {loading ? null : user ? (
              <button
                type="button"
                disabled={busy || (photosRequired && photos.length === 0)}
                onClick={submit}
                className="w-full rounded-xl bg-brand py-3.5 text-[14px] font-bold text-primary-foreground shadow-brand disabled:opacity-40"
              >
                {busy ? "جارٍ النشر…" : "نشر الإعلان مجانًا"}
              </button>
            ) : (
              <Link to="/auth" search={{ next: "/post" }} className="block w-full rounded-xl bg-brand py-3.5 text-center text-[14px] font-bold text-primary-foreground">
                سجّل الدخول لنشر الإعلان
              </Link>
            )}
          </section>
        ) : null}
      </div>

      <BottomNav />
    </div>
  );
}
