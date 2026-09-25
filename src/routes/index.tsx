import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { ListingCard } from "@/components/market/ListingCard";
import { MarketTabs } from "@/components/market/MarketTabs";
import { LocationFilter } from "@/components/location/LocationFilter";
import { listingsQuery, type ListingKind } from "@/lib/listings";
import { emptyLocation, type LocationSelection } from "@/lib/locations";
import { useAccountType } from "@/lib/use-account-type";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عقارك بنفسك — سوق العقارات المصري للعرض والطلب" },
      {
        name: "description",
        content:
          "اعرض عقارك أو سجّل طلب البحث في كل محافظات مصر، مع فلتر مناطق دقيق من المحافظة إلى الحي.",
      },
      { property: "og:title", content: "عقارك بنفسك — سوق العقارات المصري" },
      {
        property: "og:description",
        content: "سوق موحّد للعرض والطلب في 27 محافظة مصرية، من المالك مباشرة.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useAccountType();
  const [kind, setKind] = useState<ListingKind>("offer");
  const [location, setLocation] = useState<LocationSelection>(emptyLocation);

  const { data: listings = [], isPending } = useQuery(
    listingsQuery({
      kind,
      governorateId: location.governorateId,
      districtId: location.districtId,
    }),
  );

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <div className="relative mx-auto max-w-[430px] px-4 pb-32 pt-5">
        <AppHeader accountType={accountType} onAccountTypeChange={setAccountType} />

        <section className="mt-5 rounded-3xl glass-panel p-4">
          <p className="text-[11px] font-semibold text-brand">أهلاً بك</p>
          <h1 className="mt-1 font-display text-[22px] font-extrabold leading-snug text-ink">
            اعرض عقارك أو ابحث عن طلبك
          </h1>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            سوق موحّد للعرض والطلب في كل محافظات مصر
          </p>

          <div className="mt-4">
            <MarketTabs value={kind} onChange={setKind} />
          </div>
        </section>

        <div className="mt-4">
          <LocationFilter
            value={location}
            onChange={setLocation}
            actionLabel="التالي"
            onAction={() =>
              navigate({
                to: "/post",
                search: {
                  gov: location.governorateId ?? undefined,
                  district: location.districtId ?? undefined,
                  label: location.districtLabel || undefined,
                },
              })
            }
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-bold text-ink">
            {kind === "offer" ? "عقارات معروضة" : "طلبات بحث"}
          </h2>
          <span className="text-[11px] font-semibold text-ink-faint">{listings.length} نتيجة</span>
        </div>

        <div className="mt-3 space-y-3">
          {isPending ? (
            <p className="rounded-3xl glass-panel p-4 text-[12px] text-ink-soft">
              جارٍ تحميل النتائج…
            </p>
          ) : listings.length === 0 ? (
            <p className="rounded-3xl glass-panel p-4 text-[12px] text-ink-soft">
              لا توجد نتائج في هذه المنطقة بعد. جرّب محافظة أو حيًّا آخر.
            </p>
          ) : (
            listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
