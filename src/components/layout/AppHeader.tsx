import type { AccountType } from "@/lib/account";

type Props = {
  accountType: AccountType;
  onAccountTypeChange: (value: AccountType) => void;
};

/** Brand header with the Individual / Agency account switch. */
export function AppHeader({ accountType, onAccountTypeChange }: Props) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl glass-panel">
          <span className="font-display text-lg font-extrabold text-brand">ع</span>
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-[15px] font-extrabold text-ink">عقارك بنفسك</p>
          <p className="truncate text-[10px] font-medium text-ink-soft">منصة العقار المصرية</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 rounded-full glass-panel p-1">
        <button
          type="button"
          onClick={() => onAccountTypeChange("individual")}
          aria-pressed={accountType === "individual"}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            accountType === "individual"
              ? "bg-brand text-primary-foreground shadow-brand"
              : "text-ink-soft"
          }`}
        >
          أفراد
        </button>
        <button
          type="button"
          onClick={() => onAccountTypeChange("agency")}
          aria-pressed={accountType === "agency"}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            accountType === "agency" ? "bg-brand text-primary-foreground shadow-brand" : "text-ink-soft"
          }`}
        >
          مكاتب عقارية
        </button>
      </div>
    </header>
  );
}
