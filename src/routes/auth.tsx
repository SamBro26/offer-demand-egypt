import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type AuthSearch = { next?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next: typeof search["next"] === "string" && search["next"].startsWith("/") ? search["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — عقارك بنفسك" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابًا مجانيًا لنشر إعلانك والتواصل مع المعلنين." },
      { property: "og:title", content: "تسجيل الدخول — عقارك بنفسك" },
      { property: "og:description", content: "حساب مجاني بالكامل لنشر العقارات والتواصل." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").max(72),
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const goNext = () => navigate({ to: next ?? "/" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message);
    setBusy(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword(parsed.data)
        : await supabase.auth.signUp({
            ...parsed.data,
            options: { emailRedirectTo: window.location.origin },
          });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "signup") {
      toast.success("تم إنشاء الحساب. راجع بريدك لتأكيد الحساب ثم سجّل الدخول.");
      setMode("signin");
      return;
    }
    goNext();
  };

  const google = async () => {
    if (next) sessionStorage.setItem("aqarak:auth-next", next);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("تعذّر تسجيل الدخول عبر Google");
    if (!result.redirected) goNext();
  };

  const input =
    "w-full rounded-xl border border-glass-edge bg-glass-strong px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-brand";

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="relative mx-auto max-w-[430px] px-4 pt-10">
        <section className="rounded-3xl glass-panel-strong p-5">
          <h1 className="font-display text-[22px] font-extrabold text-ink">
            {mode === "signin" ? "تسجيل الدخول" : "حساب جديد"}
          </h1>
          <p className="mt-1 text-[12px] text-ink-soft">المنصة مجانية 100% — بدون اشتراكات.</p>

          <button
            type="button"
            onClick={google}
            className="mt-4 w-full rounded-xl border border-glass-edge bg-card py-3 text-[13px] font-bold text-ink"
          >
            المتابعة باستخدام Google
          </button>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <input className={input} type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
            <input className={input} type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3.5 text-[14px] font-bold text-primary-foreground shadow-brand disabled:opacity-50">
              {mode === "signin" ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-3 w-full text-[12px] font-semibold text-brand"
          >
            {mode === "signin" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
          </button>
        </section>
      </div>
    </div>
  );
}
