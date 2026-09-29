import { createFileRoute } from "@tanstack/react-router";

import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { accountTypeLabels } from "@/lib/account";
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
          <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
            يمكنك الآن نشر الإعلانات ومتابعة محادثاتك من صندوق الوارد.
          </p>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
