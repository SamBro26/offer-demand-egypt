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
export type TransactionType = "sale" | "rent";

const listingColumns =
  "id, owner_id, kind, title, description, property_type, transaction_type, price, budget_min, budget_max, area_sqm, bedrooms, bathrooms, posted_as, district_label, phone, images, created_at, governorates(name_ar), districts(name_ar)";

export type Listing = {
  id: string;
  owner_id: string | null;
  kind: ListingKind;
  title: string;
  description: string | null;
  property_type: string;
  transaction_type: TransactionType;
  price: number | null;
  budget_min: number | null;
  budget_max: number | null;
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  posted_as: "individual" | "agency";
  district_label: string | null;
  phone: string | null;
  images: string[];
  created_at: string;
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
        .select(listingColumns)
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

export const listingQuery = (id: string) =>
  queryOptions({
    queryKey: ["listing", id],
    queryFn: async (): Promise<Listing | null> => {
      const { data, error } = await supabase.from("listings").select(listingColumns).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as Listing | null;
    },
  });

/** Photos live in a private bucket; resolve stored paths to short-lived URLs. */
export const PHOTO_BUCKET = "listing-photos";
export const photoUrlsQuery = (paths: string[]) =>
  queryOptions({
    queryKey: ["photo-urls", paths],
    queryFn: async (): Promise<string[]> => {
      if (paths.length === 0) return [];
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      return (data ?? []).map((item) => item.signedUrl).filter((url): url is string => Boolean(url));
    },
    staleTime: 30 * 60 * 1000,
    enabled: paths.length > 0,
  });

/** Property types offered in the posting wizard (subset of the DB enum). */
export const wizardPropertyTypes = [
  "apartment",
  "villa",
  "chalet",
  "shop",
  "building_land",
  "agricultural_land",
] as const;
export type WizardPropertyType = (typeof wizardPropertyTypes)[number];

/** Arabic labels for property types stored as enum values. */
export const propertyTypeLabels: Record<string, string> = {
  apartment: "شقة",
  villa: "فيلا",
  duplex: "دوبلكس",
  studio: "استوديو",
  land: "أرض",
  building_land: "أرض مباني",
  agricultural_land: "أرض زراعية",
  shop: "محل تجاري",
  office: "مكتب",
  chalet: "شاليه",
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  sale: "بيع",
  rent: "إيجار",
};

export function formatEgp(value: number | null): string {
  if (value == null) return "السعر غير محدد";
  return `${new Intl.NumberFormat("en-EG").format(value)} ج.م`;
}

export function listingPriceLabel(listing: Listing): string {
  const suffix = listing.transaction_type === "rent" && (listing.price ?? listing.budget_max) ? " / شهريًا" : "";
  if (listing.kind === "offer") return formatEgp(listing.price) + suffix;
  if (listing.budget_min && listing.budget_max) {
    return `${new Intl.NumberFormat("en-EG").format(listing.budget_min)} - ${formatEgp(listing.budget_max)}${suffix}`;
  }
  return formatEgp(listing.price ?? listing.budget_max ?? listing.budget_min) + suffix;
}

/** Normalises an Egyptian mobile number into international digits for tel:/wa.me links. */
export function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
}
