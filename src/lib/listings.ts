/**
 * Listings module — the dual market.
 *
 * `kind = 'offer'`   → العقارات المعروضة (supply / العرض)
 * `kind = 'request'` → طلبات البحث (demand / الطلب)
 *
 * Both live in one table so filters, cards and queries stay shared; add a new
 * filter by extending `ListingFilters` and the builder below.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ListingKind = "offer" | "request";

export type Listing = {
  id: string;
  kind: ListingKind;
  title: string;
  description: string | null;
  property_type: string;
  price: number | null;
  budget_min: number | null;
  budget_max: number | null;
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  posted_as: "individual" | "agency";
  district_label: string | null;
  governorates: { name_ar: string } | null;
  districts: { name_ar: string } | null;
};

export type ListingFilters = {
  kind: ListingKind;
  governorateId: string | null;
  districtId: string | null;
};

export const listingsQuery = (filters: ListingFilters) =>
  queryOptions({
    queryKey: ["listings", filters],
    queryFn: async (): Promise<Listing[]> => {
      let query = supabase
        .from("listings")
        .select(
          "id, kind, title, description, property_type, price, budget_min, budget_max, area_sqm, bedrooms, bathrooms, posted_as, district_label, governorates(name_ar), districts(name_ar)",
        )
        .eq("kind", filters.kind)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (filters.governorateId) query = query.eq("governorate_id", filters.governorateId);
      if (filters.districtId) query = query.eq("district_id", filters.districtId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Listing[];
    },
  });

/** Arabic labels for property types stored as enum values. */
export const propertyTypeLabels: Record<string, string> = {
  apartment: "شقة",
  villa: "فيلا",
  duplex: "دوبلكس",
  studio: "استوديو",
  land: "أرض",
  shop: "محل",
  office: "مكتب",
  chalet: "شاليه",
};

export function formatEgp(value: number | null): string {
  if (value == null) return "غير محدد";
  return `${new Intl.NumberFormat("en-EG").format(value)} ج.م`;
}

export function listingPriceLabel(listing: Listing): string {
  if (listing.kind === "offer") return formatEgp(listing.price);
  if (listing.budget_min && listing.budget_max) {
    return `${new Intl.NumberFormat("en-EG").format(listing.budget_min)} - ${formatEgp(listing.budget_max)}`;
  }
  return formatEgp(listing.budget_max ?? listing.budget_min);
}
