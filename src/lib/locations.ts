/**
 * Location module — Egyptian administrative division.
 *
 * Source of truth is the database (`governorates` -> `districts`), seeded with
 * all 27 governorates and real districts for Cairo, Giza, Alexandria and
 * Dakahlia. Governorates without seeded districts fall back to a free-text
 * "City / District" field in the UI, so the flow stays usable everywhere.
 *
 * To add districts later, insert rows in `districts` — no UI change needed.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Governorate = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
};

export type District = {
  id: string;
  name_ar: string;
  name_en: string;
};

export const governoratesQuery = queryOptions({
  queryKey: ["governorates"],
  queryFn: async (): Promise<Governorate[]> => {
    const { data, error } = await supabase
      .from("governorates")
      .select("id, code, name_ar, name_en")
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
  staleTime: Infinity,
});

export const districtsQuery = (governorateId: string | null) =>
  queryOptions({
    queryKey: ["districts", governorateId],
    queryFn: async (): Promise<District[]> => {
      if (!governorateId) return [];
      const { data, error } = await supabase
        .from("districts")
        .select("id, name_ar, name_en")
        .eq("governorate_id", governorateId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(governorateId),
    staleTime: Infinity,
  });

/** A location selection is complete once a governorate and a district (picked
 *  from the list, or typed for governorates with no seeded districts) exist. */
export type LocationSelection = {
  governorateId: string | null;
  districtId: string | null;
  districtLabel: string;
};

export const emptyLocation: LocationSelection = {
  governorateId: null,
  districtId: null,
  districtLabel: "",
};

export function isLocationComplete(selection: LocationSelection): boolean {
  if (!selection.governorateId) return false;
  return Boolean(selection.districtId) || selection.districtLabel.trim().length > 1;
}
