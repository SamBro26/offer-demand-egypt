/** Interactions module — star ratings, likes and in-app messages per listing. */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Aggregate rating stats plus the caller's own stars (others' ratings stay private). */
export const ratingsQuery = (listingId: string, userId: string | null = null) =>
  queryOptions({
    queryKey: ["ratings", listingId, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listing_rating_stats", { _listing_id: listingId });
      if (error) throw error;
      const row = data?.[0];
      let mine = 0;
      if (userId) {
        const { data: own } = await supabase
          .from("listing_ratings").select("stars").eq("listing_id", listingId).eq("user_id", userId).maybeSingle();
        mine = own?.stars ?? 0;
      }
      return { average: Number(row?.avg_stars ?? 0), count: row?.rating_count ?? 0, mine };
    },
  });

/** Like count plus whether the caller liked it (likers stay private). */
export const likesQuery = (listingId: string, userId: string | null = null) =>
  queryOptions({
    queryKey: ["likes", listingId, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listing_like_count", { _listing_id: listingId });
      if (error) throw error;
      let liked = false;
      if (userId) {
        const { data: own } = await supabase
          .from("listing_likes").select("user_id").eq("listing_id", listingId).eq("user_id", userId).maybeSingle();
        liked = Boolean(own);
      }
      return { count: data ?? 0, liked };
    },
  });

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export const messagesQuery = (listingId: string, userId: string | null, counterpartyId: string | null = null) =>
  queryOptions({
    queryKey: ["messages", listingId, counterpartyId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!userId) return [];
      let query = supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("listing_id", listingId)
        .order("created_at");
      if (counterpartyId) {
        query = query.or(
          `and(sender_id.eq.${userId},recipient_id.eq.${counterpartyId}),and(sender_id.eq.${counterpartyId},recipient_id.eq.${userId})`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(userId),
    refetchInterval: userId ? 4000 : false,
  });
