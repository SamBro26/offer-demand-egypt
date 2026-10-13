import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, MessageCircle, Plus, UserRound } from "lucide-react";

import { useSession } from "@/lib/auth";
import { inboxMessagesQuery, unreadMessageCount } from "@/lib/inbox";
import { usePostGate } from "@/lib/use-post-gate";

const itemClass =
  "flex flex-col items-center gap-1 rounded-2xl py-2.5 text-ink-soft transition-colors";
const activeClass = "bg-brand text-primary-foreground";

export function BottomNav() {
  const { user } = useSession();
  const gatePost = usePostGate();
  const { data: messages = [] } = useQuery(inboxMessagesQuery(user?.id ?? null));
  const unread = unreadMessageCount(messages, user?.id ?? null);

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 px-4 pb-4">
      <div className="grid grid-cols-[1.35fr_1fr_1fr_1fr] items-stretch gap-1 rounded-3xl glass-panel-strong p-1.5">
        <Link
          to="/post"
          onClick={(e) => { if (!gatePost()) e.preventDefault(); }}
          className="group flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-brand to-brand-deep px-2 py-2.5 text-primary-foreground shadow-brand transition-transform active:scale-95"
        >
          <Plus aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={3} />
          <span className="whitespace-nowrap text-[10px] font-extrabold">أضف إعلانك هنا</span>
        </Link>
        <Link to="/" activeOptions={{ exact: true }} className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
          <Home aria-hidden="true" className="size-4" />
          <span className="text-[9px] font-bold">الرئيسية</span>
        </Link>
        <Link
          to="/inbox"
          className={`${itemClass} relative`}
          activeProps={{ className: `${itemClass} ${activeClass} relative` }}
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          <span className="text-[9px] font-semibold">الرسائل</span>
          {unread > 0 ? (
            <span className="absolute end-3 top-1 flex min-w-4 items-center justify-center rounded-full bg-like px-1 text-[8px] font-bold text-primary-foreground">
              {unread > 9 ? "+9" : unread}
            </span>
          ) : null}
        </Link>
        <Link
          to="/account"
          className={itemClass}
          activeProps={{ className: `${itemClass} ${activeClass}` }}
        >
          <UserRound aria-hidden="true" className="size-4" />
          <span className="text-[9px] font-semibold">حسابي</span>
        </Link>
      </div>
    </nav>
  );
}
