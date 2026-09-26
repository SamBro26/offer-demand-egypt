/** Interactions module — star ratings, likes and in-app messages per listing. */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ratingsQuery = (listingId: string) =>
  queryOptions({
    queryKey: ["ratings", listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_ratings")
        .select("user_id, stars")
        .eq("listing_id", listingId);
      if (error) throw error;
      return data ?? [];
    },
  });

export const likesQuery = (listingId: string) =>
  queryOptions({
    queryKey: ["likes", listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_likes")
        .select("user_id")
        .eq("listing_id", listingId);
      if (error) throw error;
      return data ?? [];
    },
  });

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export const messagesQuery = (listingId: string, enabled: boolean) =>
  queryOptions({
    queryKey: ["messages", listingId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("listing_id", listingId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled,
    refetchInterval: enabled ? 4000 : false,
  });
