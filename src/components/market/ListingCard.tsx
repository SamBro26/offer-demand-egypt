import apartmentImage from "@/assets/apartment.jpg";
import villaImage from "@/assets/villa.jpg";
import { listingPriceLabel, propertyTypeLabels, type Listing } from "@/lib/listings";

/** Preview imagery per property type until owners upload their own photos. */
const imageByType: Record<string, string> = {
  villa: villaImage,
  chalet: villaImage,
};

export function ListingCard({ listing }: { listing: Listing }) {
  const image = imageByType[listing.property_type] ?? apartmentImage;
  const area = listing.districts?.name_ar ?? listing.district_label ?? "";
  const governorate = listing.governorates?.name_ar ?? "";

  return (
    <article className="flex gap-3 rounded-3xl glass-panel p-3">
      <img
        src={image}
        alt={listing.title}
        loading="lazy"
        width={816}
        height={816}
        className="size-24 shrink-0 rounded-2xl object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
            {propertyTypeLabels[listing.property_type] ?? listing.property_type}
          </span>
          <span className="truncate text-[10px] font-medium text-ink-faint">
            {area}
            {area && governorate ? "، " : ""}
            {governorate}
          </span>
        </div>
        <p className="mt-1 truncate font-display text-[14px] font-bold text-ink">{listing.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-soft">
          {[
            listing.area_sqm ? `${listing.area_sqm} م²` : null,
            listing.bedrooms ? `${listing.bedrooms} غرف` : null,
            listing.bathrooms ? `${listing.bathrooms} حمام` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1 font-display text-[13px] font-extrabold text-brand-deep">
          {listingPriceLabel(listing)}
        </p>
      </div>
    </article>
  );
}
