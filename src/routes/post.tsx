import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { BottomNav } from "@/components/layout/BottomNav";
import { LocationFilter } from "@/components/location/LocationFilter";
import { MarketTabs } from "@/components/market/MarketTabs";
import type { ListingKind } from "@/lib/listings";
import { emptyLocation, type LocationSelection } from "@/lib/locations";

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
      {
        name: "description",
        content: "انشر عقارك المعروض أو طلب البحث الخاص بك، بدءًا بتحديد المحافظة والحي.",
      },
      { property: "og:title", content: "أضِف إعلانك — عقارك بنفسك" },
      {
        property: "og:description",
        content: "خطوات بسيطة لنشر عقار معروض أو طلب بحث في أي محافظة مصرية.",
      },
    ],
  }),
  component: PostPage,
});

/** Step 1 of the posting flow: market side + location. Step 2 arrives with the
 *  property details phase. */
function PostPage() {
  const search = Route.useSearch();
  const [kind, setKind] = useState<ListingKind>("offer");
  const [step, setStep] = useState<1 | 2>(1);
  const [location, setLocation] = useState<LocationSelection>({
    ...emptyLocation,
    governorateId: search.gov ?? null,
    districtId: search.district ?? null,
    districtLabel: search.label ?? "",
  });

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <div className="relative mx-auto max-w-[430px] px-4 pb-32 pt-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-[12px] font-semibold text-brand">
            رجوع
          </Link>
          <span className="text-[11px] font-medium text-ink-faint">الخطوة {step} من 2</span>
        </div>

        <h1 className="mt-3 font-display text-[22px] font-extrabold text-ink">أضِف إعلانك</h1>
        <p className="mt-1 text-[12px] text-ink-soft">
          اختر نوع الإعلان ثم حدّد الموقع بدقة من المحافظة إلى الحي.
        </p>

        <div className="mt-4 rounded-3xl glass-panel p-4">
          <MarketTabs value={kind} onChange={setKind} />
        </div>

        {step === 1 ? (
          <div className="mt-4">
            <LocationFilter
              value={location}
              onChange={setLocation}
              actionLabel="التالي"
              onAction={() => setStep(2)}
            />
          </div>
        ) : (
          <section className="mt-4 rounded-3xl glass-panel p-4">
            <h2 className="font-display text-[15px] font-bold text-ink">تفاصيل العقار</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              تم حفظ الموقع بنجاح. بيانات العقار والصور والسعر تأتي في المرحلة التالية من التطوير.
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-4 w-full rounded-xl border border-glass-edge bg-glass-strong py-3 text-[13px] font-semibold text-ink"
            >
              تعديل الموقع
            </button>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
