import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSession } from "@/lib/auth";
import { inboxMessagesQuery, unreadMessageCount } from "@/lib/inbox";
import { systemNotificationsQuery } from "@/lib/moderation";

const SEEN_KEY = "aqarak:last-notification";

/** Lightweight in-app push mockup; polling can later be replaced by native push delivery. */
export function InboxNotifier() {
  const { user } = useSession();
  const { data = [] } = useQuery(inboxMessagesQuery(user?.id ?? null));
  const { data: notices = [] } = useQuery(systemNotificationsQuery(Boolean(user)));
  const unread = unreadMessageCount(data, user?.id ?? null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (previous.current !== null && unread > previous.current) {
      toast("رسالة جديدة", {
        description: "وصلتك رسالة جديدة في صندوق الوارد",
        action: { label: "عرض", onClick: () => window.location.assign("/inbox") },
      });
    }
    previous.current = unread;
  }, [unread]);

  useEffect(() => {
    const latest = notices[0];
    if (!latest) return;
    const seen = localStorage.getItem(SEEN_KEY);
    const fresh = notices.filter((n) => !seen || n.created_at > seen).reverse();
    for (const n of fresh) toast("تنبيه من الإدارة", { description: n.body, duration: 10000 });
    localStorage.setItem(SEEN_KEY, latest.created_at);
  }, [notices]);

  return null;
}
