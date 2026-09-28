import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSession } from "@/lib/auth";
import { inboxMessagesQuery, unreadMessageCount } from "@/lib/inbox";

/** Lightweight in-app push mockup; polling can later be replaced by native push delivery. */
export function InboxNotifier() {
  const { user } = useSession();
  const { data = [] } = useQuery(inboxMessagesQuery(user?.id ?? null));
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

  return null;
}