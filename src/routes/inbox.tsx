import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCheck, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { fallbackImage } from "@/components/market/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { groupConversations, inboxMessagesQuery, type Conversation } from "@/lib/inbox";
import { photoUrlsQuery } from "@/lib/listings";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "صندوق الوارد — عقارك بنفسك" },
      { name: "description", content: "تابع محادثات العقارات والردود الجديدة في صندوق وارد واحد." },
      { property: "og:title", content: "صندوق الوارد — عقارك بنفسك" },
      { property: "og:description", content: "كل محادثات العقارات والردود الجديدة في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboxPage,
});

const messageSchema = z.string().trim().min(1).max(1000);

function InboxPage() {
  const queryClient = useQueryClient();
  const { user, loading } = useSession();
  const { data: messages = [], isPending } = useQuery(inboxMessagesQuery(user?.id ?? null));
  const conversations = useMemo(
    () => (user ? groupConversations(messages, user.id) : []),
    [messages, user],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = conversations.find((conversation) => conversation.key === selectedKey) ?? null;

  const markRead = useMutation({
    mutationFn: async (conversation: Conversation) => {
      if (!user) return;
      const unreadIds = conversation.messages
        .filter((message) => message.recipient_id === user.id && message.read_at === null)
        .map((message) => message.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-messages"] }),
  });

  const openConversation = (conversation: Conversation) => {
    setSelectedKey(conversation.key);
    markRead.mutate(conversation);
  };

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <main className="relative mx-auto max-w-[430px] px-4 pb-32 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-brand">المحادثات</p>
            <h1 className="font-display text-[22px] font-extrabold text-ink">صندوق الوارد</h1>
          </div>
          {selected ? (
            <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedKey(null)} aria-label="العودة للمحادثات">
              <ArrowRight />
            </Button>
          ) : (
            <MessageCircle aria-hidden="true" className="size-6 text-brand" />
          )}
        </div>

        {loading ? null : !user ? (
          <section className="mt-5 rounded-3xl glass-panel p-6 text-center">
            <MessageCircle aria-hidden="true" className="mx-auto size-8 text-brand" />
            <h2 className="mt-3 font-display text-[17px] font-bold text-ink">رسائلك في مكان واحد</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">سجّل الدخول لعرض محادثاتك والرد على المعلنين.</p>
            <Button asChild className="mt-4 h-11 rounded-xl px-6 text-[13px] font-bold">
              <Link to="/auth" search={{ next: "/inbox" }}>تسجيل الدخول</Link>
            </Button>
          </section>
        ) : selected ? (
          <ConversationView conversation={selected} userId={user.id} />
        ) : isPending ? (
          <p className="mt-5 rounded-3xl glass-panel p-4 text-[12px] text-ink-soft">جارٍ تحميل المحادثات…</p>
        ) : conversations.length === 0 ? (
          <section className="mt-5 rounded-3xl glass-panel p-6 text-center">
            <MessageCircle aria-hidden="true" className="mx-auto size-8 text-ink-faint" />
            <h2 className="mt-3 font-display text-[16px] font-bold text-ink">لا توجد رسائل بعد</h2>
            <p className="mt-1 text-[12px] text-ink-soft">ابدأ محادثة من صفحة أي إعلان.</p>
            <Button asChild variant="outline" className="mt-4 rounded-xl">
              <Link to="/">تصفح العقارات</Link>
            </Button>
          </section>
        ) : (
          <div className="mt-4 space-y-2">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.key}
                conversation={conversation}
                onOpen={() => openConversation(conversation)}
              />
            ))}
          </div>
        )}
      </main>
      {!selected ? <BottomNav /> : null}
    </div>
  );
}

function ConversationRow({ conversation, onOpen }: { conversation: Conversation; onOpen: () => void }) {
  const { data: urls = [] } = useQuery(photoUrlsQuery(conversation.images.slice(0, 1)));
  const image = urls[0] ?? fallbackImage(conversation.propertyType);
  const time = new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" }).format(
    new Date(conversation.latest.created_at),
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl glass-panel p-3 text-start transition-transform active:scale-[0.99]"
    >
      <img src={image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <strong className="truncate font-display text-[13px] text-ink">{conversation.listingTitle}</strong>
          <span className="shrink-0 text-[9px] text-ink-faint">{time}</span>
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className={`truncate text-[11px] ${conversation.unreadCount ? "font-bold text-ink" : "text-ink-soft"}`}>
            {conversation.latest.body}
          </span>
          {conversation.unreadCount ? (
            <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
              {conversation.unreadCount}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function ConversationView({ conversation, userId }: { conversation: Conversation; userId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      const body = messageSchema.parse(text);
      const { error } = await supabase.from("messages").insert({
        listing_id: conversation.listingId,
        sender_id: userId,
        recipient_id: conversation.counterpartyId,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
    },
    onError: () => toast.error("تعذّر إرسال الرسالة"),
  });

  return (
    <section className="mt-4 flex h-[calc(100vh-105px)] flex-col overflow-hidden rounded-3xl glass-panel-strong">
      <Link
        to="/listings/$id"
        params={{ id: conversation.listingId }}
        className="flex items-center justify-between border-b border-glass-edge px-4 py-3"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold text-brand">بخصوص الإعلان</span>
          <strong className="block truncate font-display text-[13px] text-ink">{conversation.listingTitle}</strong>
        </span>
        <span className="shrink-0 text-[10px] font-semibold text-brand">عرض الإعلان</span>
      </Link>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {conversation.messages.map((message) => {
          const mine = message.sender_id === userId;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 ${mine ? "bg-brand text-primary-foreground" : "bg-card text-ink"}`}>
                <p className="whitespace-pre-wrap text-[13px]">{message.body}</p>
                <span className={`mt-1 flex items-center gap-1 text-[8px] ${mine ? "text-primary-foreground/70" : "text-ink-faint"}`}>
                  {new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" }).format(new Date(message.created_at))}
                  {mine && message.read_at ? <CheckCheck aria-label="تمت القراءة" className="size-3" /> : null}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 border-t border-glass-edge p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) send.mutate();
        }}
      >
        <input
          value={text}
          maxLength={1000}
          onChange={(event) => setText(event.target.value)}
          placeholder="اكتب رسالتك…"
          aria-label="نص الرسالة"
          className="min-w-0 flex-1 rounded-xl border border-glass-edge bg-card px-3.5 py-3 text-[13px] text-ink outline-none focus:border-brand"
        />
        <Button type="submit" size="icon" disabled={!text.trim() || send.isPending} className="h-11 w-11 rounded-xl" aria-label="إرسال">
          <Send />
        </Button>
      </form>
    </section>
  );
}