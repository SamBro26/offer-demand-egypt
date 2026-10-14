import { useQuery } from "@tanstack/react-query";
import {
  districtsQuery,
  governoratesQuery,
  isLocationComplete,
  type LocationSelection,
} from "@/lib/locations";

type Props = {
  value: LocationSelection;
  onChange: (value: LocationSelection) => void;
  title?: string;
  /** Optional call-to-action, unlocked once governorate + district are chosen. */
  actionLabel?: string;
  onAction?: () => void;
  /** When true the action unlocks with the governorate alone; district is fully optional. */
  districtOptional?: boolean;
};

/**
 * Hierarchical Egyptian location picker: المحافظة ← المركز / المدينة / الحي.
 *
 * Governorates with seeded districts render a dependent dropdown; the rest
 * render a free-text field with a placeholder, and both paths satisfy the
 * validation rule that unlocks the action button.
 */
export function LocationFilter({
  value,
  onChange,
  title = "الموقع",
  actionLabel,
  onAction,
  districtOptional = false,
}: Props) {
  const { data: governorates = [] } = useQuery(governoratesQuery);
  const { data: districts = [], isFetching } = useQuery(districtsQuery(value.governorateId));

  const hasGovernorate = Boolean(value.governorateId);
  const hasDistrictList = districts.length > 0;
  const unlocked = districtOptional ? hasGovernorate : isLocationComplete(value);

  return (
    <section className="rounded-3xl glass-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-ink">{title}</h2>
        <span className="text-[10px] font-medium text-ink-faint">المحافظة ← المدينة</span>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-[11px] font-semibold text-ink-soft">المحافظة</span>
        <div className="relative">
          <select
            value={value.governorateId ?? ""}
            onChange={(event) =>
              onChange({
                governorateId: event.target.value || null,
                districtId: null,
                districtLabel: "",
              })
            }
            className="w-full appearance-none rounded-xl border border-glass-edge bg-glass-strong px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-brand"
          >
            <option value="">اختر المحافظة</option>
            {governorates.map((governorate) => (
              <option key={governorate.id} value={governorate.id}>
                {governorate.name_ar}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
            ▾
          </span>
        </div>
      </label>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-[11px] font-semibold text-ink-soft">
          المركز / المدينة / الحي
        </span>
        {hasDistrictList ? (
          <div className="relative">
            <select
              value={value.districtId ?? ""}
              disabled={!hasGovernorate}
              onChange={(event) =>
                onChange({ ...value, districtId: event.target.value || null, districtLabel: "" })
              }
              className="w-full appearance-none rounded-xl border border-glass-edge bg-glass-strong px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-brand disabled:opacity-50"
            >
              <option value="">اختر المدينة / الحي</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name_ar}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
              ▾
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={value.districtLabel}
            disabled={!hasGovernorate || isFetching}
            placeholder="اكتب اسم المركز / المدينة / الحي"
            onChange={(event) =>
              onChange({ ...value, districtId: null, districtLabel: event.target.value })
            }
            className="w-full rounded-xl border border-glass-edge bg-glass-strong px-3.5 py-3 text-[13px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-faint focus:border-brand disabled:opacity-50"
          />
        )}
        {hasGovernorate && !hasDistrictList && !isFetching ? (
          <span className="mt-1.5 block text-[10px] font-medium text-ink-faint">
            لم تُضَف أحياء لهذه المحافظة بعد — اكتب اسم المنطقة يدويًا.
          </span>
        ) : null}
      </label>

      {actionLabel ? (
        <button
          type="button"
          disabled={!unlocked}
          onClick={onAction}
          className="mt-4 w-full rounded-xl bg-brand py-3.5 text-[14px] font-bold text-primary-foreground shadow-brand transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
