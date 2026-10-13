import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Flag, Mail, Send, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { accountTypeLabels } from "@/lib/account";
import { adminDeleteUser, adminSetUserBan } from "@/lib/moderation.functions";

import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { Button } from "@/components/ui/button";
import { fallbackImage } from "@/components/market/ListingCard";
import { adminReportsQuery, adminUsersQuery, supportMessagesQuery, type AdminReport, type AdminUser } from "@/lib/moderation";
import { getAdminStatus } from "@/lib/moderation.functions";
import { photoUrlsQuery, propertyTypeLabels } from "@/lib/listings";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { isAdmin } = await getAdminStatus();
    if (!isAdmin) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "لوحة التحكم — عقارك بنفسك" },
      { name: "description", content: "مراجعة بلاغات الإعلانات وإدارة المحتوى المخالف." },
      { property: "og:title", content: "لوحة التحكم — عقارك بنفسك" },
      { property: "og:description", content: "لوحة خاصة لمراجعة بلاغات عقارك بنفسك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <main className="relative mx-auto max-w-4xl px-4 pb-16 pt-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-brand">الإدارة</p>
            <h1 className="font-display text-[24px] font-extrabold text-ink">لوحة التحكم</h1>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/account">حسابي</Link></Button>
        </header>
        <Tabs defaultValue="users" dir="rtl" className="mt-5">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="users" className="text-[12px]">إدارة المستخدمين</TabsTrigger>
            <TabsTrigger value="notify" className="text-[12px]">إرسال التنبيهات</TabsTrigger>
            <TabsTrigger value="reports" className="text-[12px]">التبليغات والرسائل</TabsTrigger>
          </TabsList>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="notify"><NotifyTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function UsersTab() {
  const { data: users = [], isPending, isError } = useQuery(adminUsersQuery);
  const { user: me } = useSession();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ user: AdminUser; kind: "ban" | "unban" | "delete" } | null>(null);
  const action = useMutation({
    mutationFn: async (p: NonNullable<typeof pending>) =>
      p.kind === "delete"
        ? adminDeleteUser({ data: { userId: p.user.id } })
        : adminSetUserBan({ data: { userId: p.user.id, banned: p.kind === "ban" } }),
    onSuccess: (_r, p) => {
      toast.success(p.kind === "delete" ? "تم حذف الحساب" : p.kind === "ban" ? "تم حظر الحساب" : "تم رفع الحظر");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: () => toast.error("تعذّر تنفيذ الإجراء"),
  });
  if (isPending) return <p className="mt-3 rounded-2xl glass-panel p-4 text-[12px] text-ink-soft">جارٍ تحميل المستخدمين…</p>;
  if (isError) return <p className="mt-3 rounded-2xl glass-panel p-4 text-[12px] text-destructive">تعذّر تحميل المستخدمين.</p>;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] text-ink-soft">{users.length} مستخدم مسجل</p>
      {users.map((u) => (
        <article key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl glass-panel p-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[14px] font-bold text-ink">{u.name || "بدون اسم"}</p>
            <p className="truncate text-[11px] text-ink-soft" dir="ltr">{u.email}</p>
            <div className="mt-1 flex gap-1.5 text-[9px] font-bold">
              <span className="rounded-full bg-mist px-2 py-0.5 text-ink-soft">{accountTypeLabels[u.accountType]}</span>
              {u.isAdmin ? <span className="rounded-full bg-mist px-2 py-0.5 text-brand">مشرف</span> : null}
              {u.banned ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">محظور</span> : null}
            </div>
          </div>
          {u.id === me?.id ? null : (
            <div className="flex gap-2">
              {u.banned ? (
                <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => setPending({ user: u, kind: "unban" })}><Undo2 /> رفع الحظر</Button>
              ) : (
                <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => setPending({ user: u, kind: "ban" })}><Ban /> حظر الحساب</Button>
              )}
              <Button size="sm" variant="destructive" disabled={action.isPending} onClick={() => setPending({ user: u, kind: "delete" })}><Trash2 /> حذف الحساب</Button>
            </div>
          )}
        </article>
      ))}
      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent dir="rtl" className="max-w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>
              {pending?.kind === "delete" ? "حذف الحساب نهائيًا؟" : pending?.kind === "ban" ? "حظر هذا الحساب؟" : "رفع الحظر عن الحساب؟"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "delete"
                ? "سيُحذف الحساب وكل إعلاناته ورسائله وصوره نهائيًا. لا يمكن التراجع."
                : pending?.kind === "ban"
                  ? "سيُمنع المستخدم من الدخول وتُؤرشف إعلاناته المنشورة."
                  : "سيتمكن المستخدم من الدخول مجددًا."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pending) action.mutate(pending); setPending(null); }}
            >تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NotifyTab() {
  const { user } = useSession();
  const [body, setBody] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("system_notifications").insert({ body: body.trim(), created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم إرسال التنبيه لجميع المستخدمين"); setBody(""); },
    onError: () => toast.error("تعذّر إرسال التنبيه"),
  });
  return (
    <section className="mt-3 rounded-2xl glass-panel p-4">
      <h2 className="font-display text-[16px] font-bold text-ink">تنبيه لجميع المستخدمين</h2>
      <p className="mt-1 text-[11px] text-ink-soft">يظهر التنبيه لكل مستخدم مسجّل عند فتح التطبيق.</p>
      <Textarea value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} placeholder="اكتب نص التنبيه…" className="mt-3 min-h-28" />
      <Button className="mt-3" disabled={!body.trim() || send.isPending || !user} onClick={() => send.mutate()}>
        <Send /> {send.isPending ? "جارٍ الإرسال…" : "إرسال"}
      </Button>
    </section>
  );
}

function ReportsTab() {
  const { data: reports = [], isPending } = useQuery(adminReportsQuery);
  const { data: messages = [] } = useQuery(supportMessagesQuery);
  return (
    <div className="mt-3 space-y-5">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl glass-panel p-4">
          <Flag className="size-5 text-brand" />
          <strong className="mt-2 block font-display text-[24px] text-ink">{reports.filter((r) => r.status === "pending").length}</strong>
          <span className="text-[11px] text-ink-soft">بلاغات بانتظار المراجعة</span>
        </div>
        <div className="rounded-2xl glass-panel p-4">
          <Mail className="size-5 text-brand" />
          <strong className="mt-2 block font-display text-[24px] text-ink">{messages.length}</strong>
          <span className="text-[11px] text-ink-soft">رسائل الدعم</span>
        </div>
      </section>
      <section>
        <h2 className="mb-2 font-display text-[15px] font-bold text-ink">بلاغات الإعلانات</h2>
        {isPending ? (
          <p className="rounded-2xl glass-panel p-4 text-[12px] text-ink-soft">جارٍ تحميل البلاغات…</p>
        ) : reports.length === 0 ? (
          <p className="rounded-2xl glass-panel p-4 text-center text-[12px] text-ink-soft"><ShieldCheck className="mx-auto mb-1 size-6 text-whatsapp" />لا توجد بلاغات</p>
        ) : (
          <div className="space-y-3">{reports.map((report) => <ReportRow key={report.id} report={report} />)}</div>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-display text-[15px] font-bold text-ink">رسائل الدعم والتواصل</h2>
        {messages.length === 0 ? (
          <p className="rounded-2xl glass-panel p-4 text-center text-[12px] text-ink-soft">لا توجد رسائل بعد</p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <article key={m.id} className="rounded-2xl glass-panel p-3">
                <div className="flex justify-between gap-2 text-[10px] text-ink-faint">
                  <span dir="ltr">{m.sender_email}</span>
                  <span>{new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(m.created_at))}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-ink">{m.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReportRow({ report }: { report: AdminReport }) {
  const listing = Array.isArray(report.listings) ? report.listings[0] : report.listings;
  const { data: urls = [] } = useQuery(photoUrlsQuery(listing?.images.slice(0, 1) ?? []));
  if (!listing) return null;
  const image = urls[0] ?? fallbackImage(listing.property_type);
  const date = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.created_at));
  return (
    <article className="rounded-2xl glass-panel p-3 sm:flex sm:items-center sm:gap-4">
      <img src={image} alt="" className="aspect-[16/8] w-full rounded-xl object-cover sm:size-24 sm:shrink-0" />
      <div className="mt-3 min-w-0 flex-1 sm:mt-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-brand">{propertyTypeLabels[listing.property_type] ?? listing.property_type}</span>
            <h2 className="truncate font-display text-[15px] font-bold text-ink">{listing.title}</h2>
          </div>
          <span className="shrink-0 rounded-full bg-mist px-2 py-1 text-[9px] font-bold text-ink-soft">{report.status === "pending" ? "جديد" : "تم الإجراء"}</span>
        </div>
        <p className="mt-1 text-[10px] text-ink-faint">{date}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/listings/$id" params={{ id: listing.id }}>عرض</Link></Button>
          <AdminActionButtons listingId={report.listing_id} canBan={Boolean(listing.owner_id)} />
        </div>
      </div>
    </article>
  );
}