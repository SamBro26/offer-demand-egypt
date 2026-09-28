/** Reserved placement for the native Google AdMob banner integration. */
export function AdBanner() {
  return (
    <aside
      aria-label="Advertisement Space - Google AdMob"
      className="flex h-[60px] w-full items-center justify-center rounded-lg border border-dashed border-ink-faint/50 bg-glass/70 px-3 text-center"
    >
      <span className="text-[10px] font-semibold text-ink-faint" dir="ltr">
        Advertisement Space - Google AdMob
      </span>
    </aside>
  );
}