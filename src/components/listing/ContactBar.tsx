import { useState } from "react";
import { toast } from "sonner";

import { toInternationalPhone, type Listing } from "@/lib/listings";
import { ChatSheet } from "./ChatSheet";

/**
 * Permanent free contact system: in-app message, phone call and WhatsApp are
 * always shown for every listing and every visitor — no paywall.
 */
export function ContactBar({ listing }: { listing: Listing }) {
  const [chatOpen, setChatOpen] = useState(false);
  const phone = listing.phone ? toInternationalPhone(listing.phone) : null;
  const noPhone = () => toast("لم يُضف المعلن رقم هاتف — راسله داخل التطبيق");
  const whatsappText = encodeURIComponent(`مرحبًا، بخصوص إعلانك "${listing.title}" على عقارك بنفسك`);

  const base =
    "flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2.5 text-[11px] font-bold transition-transform active:scale-95";

  return (
    <>
      <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 px-4 pb-4">
        <div className="grid grid-cols-3 gap-1.5 rounded-3xl glass-panel-strong p-1.5">
          <button type="button" onClick={() => setChatOpen(true)} className={`${base} bg-brand text-primary-foreground`}>
            <span className="text-[16px]">💬</span>
            رسالة
          </button>
          {phone ? (
            <a href={`tel:+${phone}`} className={`${base} bg-card text-ink`}>
              <span className="text-[16px]">📞</span>
              اتصال
            </a>
          ) : (
            <button type="button" onClick={noPhone} className={`${base} bg-card text-ink`}>
              <span className="text-[16px]">📞</span>
              اتصال
            </button>
          )}
          {phone ? (
            <a
              href={`https://wa.me/${phone}?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${base} bg-whatsapp text-primary-foreground`}
            >
              <span className="text-[16px]">🟢</span>
              واتساب
            </a>
          ) : (
            <button type="button" onClick={noPhone} className={`${base} bg-whatsapp text-primary-foreground`}>
              <span className="text-[16px]">🟢</span>
              واتساب
            </button>
          )}
        </div>
      </div>
      {chatOpen ? <ChatSheet listing={listing} onClose={() => setChatOpen(false)} /> : null}
    </>
  );
}
