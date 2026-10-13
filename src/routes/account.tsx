import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { adminStatusQuery } from "@/lib/moderation";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { accountTypeLabels } from "@/lib/account";
import { deleteMyAccount } from "@/lib/account.functions";
import { useSession } from "@/lib/auth";
import { useAccountType } from "@/lib/use-account-type";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي — عقارك بنفسك" },
      {
        name: "description",
        content: "اختر نوع الحساب: فرد أو مكتب عقاري، وتابع إعلاناتك على عقارك بنفسك.",
      },
      { property: "og:title", content: "حسابي — عقارك بنفسك" },
      { property: "og:description", content: "إدارة نوع الحساب والإعلانات على عقارك بنفسك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [accountType, setAccountType] = useAccountType();
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const removeAccount = useServerFn(deleteMyAccount);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: adminStatus } = useQuery(adminStatusQuery(Boolean(user)));
  const [support, setSupport] = useState("");
  const sendSupport = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_messages").insert({
        sender_id: user!.id, sender_email: user!.email ?? null, body: support.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم إرسال رسالتك للإدارة"); setSupport(""); },
    onError: () => toast.error("تعذّر إرسال الرسالة"),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/", replace: true });
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await removeAccount();
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.success("تم حذف حسابك نهائيًا");
      navigate({ to: "/", replace: true });
    } catch (err) {
      console.error(err);
      toast.error("تعذّر حذف الحساب، حاول مرة أخرى");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <div className="relative mx-auto max-w-[430px] px-4 pb-32 pt-5">
        <AppHeader accountType={accountType} onAccountTypeChange={setAccountType} />

        <section className="mt-5 rounded-3xl glass-panel p-4">
          <h1 className="font-display text-[18px] font-extrabold text-ink">حسابي</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            أنت تتصفح الآن كـ <span className="font-bold text-brand">{accountTypeLabels[accountType]}</span>.
          </p>
          {user ? (
            <p className="mt-2 text-[12px] text-ink-soft" dir="ltr">{user.email}</p>
          ) : null}
        </section>

        {loading ? null : user ? (
          <>
          {adminStatus?.isAdmin ? (
            <Link
              to="/admin"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[14px] font-bold text-primary-foreground shadow-brand"
            >
              <LayoutDashboard className="size-4" /> لوحة التحكم
            </Link>
          ) : null}
          <section className="mt-4 rounded-3xl glass-panel p-4">
            <h2 className="font-display text-[15px] font-bold text-ink">تواصل مع الإدارة</h2>
            <Textarea value={support} maxLength={2000} onChange={(e) => setSupport(e.target.value)} placeholder="اكتب استفسارك أو شكواك…" className="mt-2 min-h-20" />
            <button
              type="button"
              disabled={!support.trim() || sendSupport.isPending}
              onClick={() => sendSupport.mutate()}
              className="mt-2 w-full rounded-xl bg-glass-strong py-3 text-[13px] font-bold text-ink outline-1 outline-glass-edge disabled:opacity-50"
            >
              {sendSupport.isPending ? "جارٍ الإرسال…" : "إرسال"}
            </button>
          </section>
          <section className="mt-4 space-y-2.5 rounded-3xl glass-panel p-4">
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-xl bg-glass-strong py-3.5 text-[14px] font-bold text-ink outline-1 outline-glass-edge"
            >
              تسجيل الخروج
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="w-full rounded-xl bg-destructive py-3.5 text-[14px] font-bold text-destructive-foreground"
            >
              إلغاء الحساب
            </button>
          </section>
          </>
        ) : (
          <Link
            to="/auth"
            search={{ next: "/account" }}
            className="mt-4 block w-full rounded-xl bg-brand py-3.5 text-center text-[14px] font-bold text-primary-foreground shadow-brand"
          >
            تسجيل الدخول
          </Link>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !busy && setConfirmOpen(o)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحساب نهائيًا؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف حسابك وكل إعلاناتك ورسائلك وصورك بشكل دائم، ولا يمكن التراجع عن ذلك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>تراجع</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
              className="bg-destructive text-destructive-foreground"
            >
              {busy ? "جارٍ الحذف…" : "نعم، احذف حسابي"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
