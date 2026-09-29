import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type InboxMessage = {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
  listings: {
    id: string;
    title: string;
    owner_id: string | null;
    images: string[];
    property_type: string;
  } | null;
};

export type Conversation = {
  key: string;
  listingId: string;
  listingTitle: string;
  listingOwnerId: string | null;
  propertyType: string;
  images: string[];
  counterpartyId: string;
  messages: InboxMessage[];
  latest: InboxMessage;
  unreadCount: number;
};

const inboxColumns =
  "id, listing_id, sender_id, recipient_id, body, created_at, read_at, listings(id, title, owner_id, images, property_type)";

export const inboxMessagesQuery = (userId: string | null) =>
  queryOptions({
    queryKey: ["inbox-messages", userId],
    queryFn: async (): Promise<InboxMessage[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select(inboxColumns)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InboxMessage[];
    },
    enabled: Boolean(userId),
    refetchInterval: userId ? 4000 : false,
  });

export function groupConversations(messages: InboxMessage[], userId: string): Conversation[] {
  const grouped = new Map<string, InboxMessage[]>();
  for (const message of messages) {
    const counterpartyId = message.sender_id === userId ? message.recipient_id : message.sender_id;
    if (!counterpartyId) continue;
    const key = `${message.listing_id}:${counterpartyId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), message]);
  }

  const conversations: Conversation[] = [];
  for (const [key, thread] of grouped) {
    const latest = thread[0];
    if (!latest) continue;
    const counterpartyId = latest.sender_id === userId ? latest.recipient_id : latest.sender_id;
    conversations.push({
      key,
      listingId: latest.listing_id,
      listingTitle: latest.listings?.title ?? "إعلان غير متاح",
      listingOwnerId: latest.listings?.owner_id ?? null,
      propertyType: latest.listings?.property_type ?? "apartment",
      images: latest.listings?.images ?? [],
      counterpartyId: counterpartyId ?? "",
      messages: [...thread].reverse(),
      latest,
      unreadCount: thread.filter(
        (message) => message.recipient_id === userId && message.read_at === null,
      ).length,
    });
  }
  return conversations.sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at));
}

export function unreadMessageCount(messages: InboxMessage[], userId: string | null) {
  if (!userId) return 0;
  return messages.filter((message) => message.recipient_id === userId && message.read_at === null).length;
}