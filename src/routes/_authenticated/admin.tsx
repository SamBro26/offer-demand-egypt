import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flag, ShieldCheck } from "lucide-react";

import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { Button } from "@/components/ui/button";
import { fallbackImage } from "@/components/market/ListingCard";
import { adminReportsQuery, type AdminReport } from "@/lib/moderation";
import { getAdminStatus } from "@/lib/moderation.functions";
import { photoUrlsQuery, propertyTypeLabels } from "@/lib/listings";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { isAdmin } = await getAdminStatus();
    if (!isAdmin) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "لوحة الإشراف — عقارك بنفسك" },
      { name: "description", content: "مراجعة بلاغات الإعلانات وإدارة المحتوى المخالف." },
      { property: "og:title", content: "لوحة الإشراف — عقارك بنفسك" },
      { property: "og:description", content: "لوحة خاصة لمراجعة بلاغات عقارك بنفسك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: reports = [], isPending } = useQuery(adminReportsQuery);
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <main className="relative mx-auto max-w-4xl px-4 pb-16 pt-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-brand">الإدارة والمراجعة</p>
            <h1 className="font-display text-[24px] font-extrabold text-ink">بلاغات الإعلانات</h1>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/">الرئيسية</Link></Button>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl glass-panel p-4">
            <Flag className="size-5 text-brand" />
            <strong className="mt-2 block font-display text-[24px] text-ink">{reports.length}</strong>
            <span className="text-[11px] text-ink-soft">إجمالي البلاغات</span>
          </div>
          <div className="rounded-2xl glass-panel p-4">
            <ShieldCheck className="size-5 text-whatsapp" />
            <strong className="mt-2 block font-display text-[24px] text-ink">
              {reports.filter((report) => report.status === "pending").length}
            </strong>
            <span className="text-[11px] text-ink-soft">بانتظار المراجعة</span>
          </div>
        </section>

        {isPending ? (
          <p className="mt-5 rounded-2xl glass-panel p-4 text-[12px] text-ink-soft">جارٍ تحميل البلاغات…</p>
        ) : reports.length === 0 ? (
          <section className="mt-5 rounded-2xl glass-panel p-8 text-center">
            <ShieldCheck className="mx-auto size-9 text-whatsapp" />
            <h2 className="mt-3 font-display text-[17px] font-bold text-ink">لا توجد بلاغات</h2>
            <p className="mt-1 text-[12px] text-ink-soft">كل الإعلانات المبلّغ عنها ستظهر هنا للمراجعة.</p>
          </section>
        ) : (
          <div className="mt-5 space-y-3">
            {reports.map((report) => <ReportRow key={report.id} report={report} />)}
          </div>
        )}
      </main>
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