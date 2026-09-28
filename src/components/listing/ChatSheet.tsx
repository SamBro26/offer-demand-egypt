import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { messagesQuery } from "@/lib/interactions";
import type { Listing } from "@/lib/listings";

const bodySchema = z.string().trim().min(1).max(1000);

/** Mini chat window anchored to the bottom of the screen. */
export function ChatSheet({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user, loading } = useSession();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const recipientId = listing.owner_id === user?.id ? null : listing.owner_id;
  const { data: messages = [] } = useQuery(messagesQuery(listing.id, user?.id ?? null, recipientId));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      const body = bodySchema.parse(text);
      if (!user || !recipientId) return;
      const { error } = await supabase.from("messages").insert({
        listing_id: listing.id,
        sender_id: user.id,
        recipient_id: recipientId,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", listing.id] });
    },
    onError: () => toast.error("تعذّر إرسال الرسالة"),
  });

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30" onClick={onClose}>
      <div
        className="flex h-[70vh] w-full max-w-[430px] flex-col rounded-t-3xl glass-panel-strong"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="محادثة"
      >
        <div className="flex items-center justify-between border-b border-glass-edge p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-brand">محادثة مجانية</p>
            <p className="truncate font-display text-[14px] font-bold text-ink">{listing.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="text-[20px] text-ink-soft">
            ×
          </button>
        </div>

        {loading ? null : !user ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-[13px] text-ink-soft">سجّل الدخول لبدء المحادثة مع المعلن — مجانًا.</p>
            <Link
              to="/auth"
              search={{ next: `/listings/${listing.id}` }}
              className="rounded-xl bg-brand px-6 py-3 text-[13px] font-bold text-primary-foreground"
            >
              تسجيل الدخول
            </Link>
          </div>
        ) : !recipientId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-[13px] text-ink-soft">محادثات هذا الإعلان موجودة في صندوق الوارد.</p>
            <Link to="/inbox" className="rounded-xl bg-brand px-6 py-3 text-[13px] font-bold text-primary-foreground">
              فتح صندوق الوارد
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="mt-8 text-center text-[12px] text-ink-faint">ابدأ المحادثة بإرسال أول رسالة.</p>
              ) : (
                messages.map((message) => {
                  const mine = message.sender_id === user.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                      <p
                        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] ${
                          mine ? "bg-brand text-primary-foreground" : "bg-card text-ink"
                        }`}
                      >
                        {message.body}
                      </p>
                    </div>
                  );
                })
              )}
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
                className="flex-1 rounded-xl border border-glass-edge bg-card px-3.5 py-3 text-[13px] text-ink outline-none focus:border-brand"
              />
              <button
                disabled={!text.trim() || send.isPending}
                className="rounded-xl bg-brand px-4 text-[13px] font-bold text-primary-foreground disabled:opacity-40"
              >
                إرسال
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
