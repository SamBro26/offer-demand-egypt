import type { ListingKind } from "@/lib/listings";

type Props = {
  value: ListingKind;
  onChange: (value: ListingKind) => void;
  /** Optional per-context labels (e.g. the posting wizard uses shorter ones). */
  labels?: { offer: string; request: string };
};

const defaultLabels = { offer: "العقارات المعروضة", request: "طلبات البحث" };

/** Dual-market switch: supply (العرض) vs demand (الطلب). */
export function MarketTabs({ value, onChange, labels = defaultLabels }: Props) {
  const tabs: { value: ListingKind; label: string }[] = [
    { value: "offer", label: labels.offer },
    { value: "request", label: labels.request },
  ];
    <div role="tablist" className="grid grid-cols-2 gap-1.5 rounded-2xl bg-mist/70 p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-xl py-2.5 text-[13px] transition-all ${
            value === tab.value
              ? "bg-card font-bold text-brand shadow-glass-sm outline-1 outline-glass-edge"
              : "font-semibold text-ink-soft"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
