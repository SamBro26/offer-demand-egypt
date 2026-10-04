/**
 * Location module — Egyptian administrative division.
 *
 * Source of truth is the database (`governorates` -> `districts`), seeded from
 * egypt.json with all 27 governorates and their districts / centers.
 *
 * Caching: the full dataset is loaded once and stored in localStorage under a
 * versioned key. Later launches read it from there instantly; when the cache
 * is missing or stale (bump LOCATION_CACHE_VERSION after re-seeding), it is
 * fetched in a single request, saved, then rendered.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Governorate = { id: string; code: string; name_ar: string; name_en: string };
export type District = { id: string; name_ar: string; name_en: string };
type LocationData = { governorates: Governorate[]; districts: Record<string, District[]> };

const LOCATION_CACHE_VERSION = 2;
const CACHE_KEY = `aqarak:locations:v${LOCATION_CACHE_VERSION}`;

function readCache(): LocationData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LocationData) : null;
  } catch {
    return null;
  }
}

function writeCache(data: LocationData) {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("aqarak:locations:") && key !== CACHE_KEY) window.localStorage.removeItem(key);
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable — app still works from memory */
  }
}

async function fetchLocationData(): Promise<LocationData> {
  const cached = readCache();
  if (cached) return cached;
  const [g, d] = await Promise.all([
    supabase.from("governorates").select("id, code, name_ar, name_en").order("sort_order"),
    supabase.from("districts").select("id, governorate_id, name_ar, name_en").order("sort_order").range(0, 4999),
  ]);
  if (g.error) throw g.error;
  if (d.error) throw d.error;
  const districts: Record<string, District[]> = {};
  for (const row of d.data ?? []) {
    (districts[row.governorate_id] ??= []).push({ id: row.id, name_ar: row.name_ar, name_en: row.name_en });
  }
  const data = { governorates: g.data ?? [], districts };
  if (typeof window !== "undefined") writeCache(data);
  return data;
}

export const locationDataQuery = queryOptions({
  queryKey: ["location-data", LOCATION_CACHE_VERSION],
  queryFn: fetchLocationData,
  staleTime: Infinity,
  gcTime: Infinity,
});

export const governoratesQuery = queryOptions({
  ...locationDataQuery,
  select: (data: LocationData) => data.governorates,
});

export const districtsQuery = (governorateId: string | null) =>
  queryOptions({
    ...locationDataQuery,
    select: (data: LocationData) => (governorateId ? data.districts[governorateId] ?? [] : []),
  });

/** A location selection is complete once a governorate and a district (picked
 *  from the list, or typed for governorates with no districts) exist. */
export type LocationSelection = {
  governorateId: string | null;
  districtId: string | null;
  districtLabel: string;
};

export const emptyLocation: LocationSelection = { governorateId: null, districtId: null, districtLabel: "" };

export function isLocationComplete(selection: LocationSelection): boolean {
  if (!selection.governorateId) return false;
  return Boolean(selection.districtId) || selection.districtLabel.trim().length > 1;
}
