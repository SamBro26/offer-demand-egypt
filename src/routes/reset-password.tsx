import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور — عقارك بنفسك" },
      { name: "description", content: "عيّن كلمة مرور جديدة لحسابك على عقارك بنفسك." },
      { property: "og:title", content: "إعادة تعيين كلمة المرور — عقارك بنفسك" },
      { property: "og:description", content: "عيّن كلمة مرور جديدة لحسابك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) { toast.error("كلمة المرور 6 أحرف على الأقل"); return; }
    if (password !== confirm) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error("انتهت صلاحية الرابط أو حدث خطأ. اطلب رابطًا جديدًا."); return; }
    toast.success("تم تغيير كلمة المرور بنجاح.");
    navigate({ to: "/" });
  };

  const input =
    "w-full rounded-xl border border-glass-edge bg-glass-strong px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-brand";

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="relative mx-auto max-w-[430px] px-4 pt-10">
        <section className="rounded-3xl glass-panel-strong p-5">
          <h1 className="font-display text-[22px] font-extrabold text-ink">كلمة مرور جديدة</h1>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input className={input} type="password" placeholder="كلمة المرور الجديدة" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
            <input className={input} type="password" placeholder="تأكيد كلمة المرور الجديدة" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" />
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3.5 text-[14px] font-bold text-primary-foreground shadow-brand disabled:opacity-50">
              حفظ كلمة المرور
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
