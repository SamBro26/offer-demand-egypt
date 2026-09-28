import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { AdBanner } from "@/components/advertising/AdBanner";
import { ContactBar } from "@/components/listing/ContactBar";
import { LikeButton, StarRating } from "@/components/listing/Interactions";
import { fallbackImage } from "@/components/market/ListingCard";
import {
  listingPriceLabel,
  listingQuery,
  photoUrlsQuery,
  propertyTypeLabels,
  transactionTypeLabels,
} from "@/lib/listings";

export const Route = createFileRoute("/listings/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل العقار — عقارك بنفسك" },
      { name: "description", content: "صور وتفاصيل العقار مع التواصل المجاني عبر الرسائل والاتصال وواتساب." },
      { property: "og:title", content: "تفاصيل العقار — عقارك بنفسك" },
      { property: "og:description", content: "تواصل مجانًا مع المعلن مباشرة." },
    ],
  }),
  component: ListingPage,
});

function ListingPage() {
  const { id } = Route.useParams();
  const { data: listing, isPending } = useQuery(listingQuery(id));
  const { data: urls = [] } = useQuery(photoUrlsQuery(listing?.images ?? []));
  const [active, setActive] = useState(0);

  if (isPending) return <Shell><p className="rounded-3xl glass-panel p-4 text-[12px] text-ink-soft">جارٍ التحميل…</p></Shell>;
  if (!listing)
    return (
      <Shell>
        <p className="rounded-3xl glass-panel p-4 text-[13px] text-ink-soft">هذا الإعلان غير متاح.</p>
      </Shell>
    );

  const photos = urls.length ? urls : [fallbackImage(listing.property_type)];
  const place = [listing.districts?.name_ar ?? listing.district_label, listing.governorates?.name_ar]
    .filter(Boolean)
    .join("، ");
  const facts = [
    ["نوع العقار", propertyTypeLabels[listing.property_type] ?? listing.property_type],
    ["نوع المعاملة", transactionTypeLabels[listing.transaction_type]],
    ["الإعلان", listing.kind === "offer" ? "عقار معروض" : "طلب بحث"],
    ["المعلن", listing.posted_as === "agency" ? "مكتب عقاري" : "فرد"],
    listing.area_sqm ? ["المساحة", `${listing.area_sqm} م²`] : null,
    listing.bedrooms ? ["الغرف", String(listing.bedrooms)] : null,
    listing.bathrooms ? ["الحمامات", String(listing.bathrooms)] : null,
  ].filter((row): row is string[] => Boolean(row));

  return (
    <Shell>
      <div className="overflow-hidden rounded-3xl glass-panel p-2">
        <img src={photos[active] ?? photos[0]} alt={listing.title} className="aspect-[4/3] w-full rounded-2xl object-cover" />
        {photos.length > 1 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {photos.map((url, index) => (
              <button key={url} type="button" onClick={() => setActive(index)} className={`shrink-0 rounded-xl ${index === active ? "outline-2 outline-brand" : "opacity-70"}`}>
                <img src={url} alt="" className="size-14 rounded-xl object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <section className="mt-4 rounded-3xl glass-panel p-4">
        <p className="text-[11px] font-semibold text-brand">{place}</p>
        <h1 className="mt-1 font-display text-[20px] font-extrabold leading-snug text-ink">{listing.title}</h1>
        <p className="mt-2 font-display text-[18px] font-extrabold text-brand-deep">{listingPriceLabel(listing)}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <StarRating listingId={listing.id} />
          <LikeButton listingId={listing.id} />
        </div>
      </section>

      <section className="mt-4 rounded-3xl glass-panel p-4">
        <h2 className="font-display text-[15px] font-bold text-ink">البيانات</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-glass-strong p-3">
              <dt className="text-[10px] font-semibold text-ink-faint">{label}</dt>
              <dd className="mt-0.5 text-[13px] font-bold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        {listing.description ? (
          <>
            <h2 className="mt-4 font-display text-[15px] font-bold text-ink">الوصف</h2>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">{listing.description}</p>
          </>
        ) : null}
      </section>

      <div className="mt-5">
        <AdBanner />
      </div>

      <ContactBar listing={listing} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="relative mx-auto max-w-[430px] px-4 pb-32 pt-5">
        <Link to="/" className="mb-3 inline-block text-[12px] font-semibold text-brand">
          رجوع
        </Link>
        {children}
      </div>
    </div>
  );
}
