/** Fixed, globally shared placement for the native Google AdMob banner integration. */
export function AdBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-15 border-b border-glass-edge bg-background/95 px-4 backdrop-blur-xl">
      <aside
        aria-label="Advertisement Space - Google AdMob"
        className="mx-auto flex h-full w-full max-w-4xl items-center justify-center border-x border-dashed border-ink-faint/50 px-3 text-center"
      >
        <span className="text-[10px] font-semibold text-ink-faint" dir="ltr">
          Advertisement Space - Google AdMob
        </span>
      </aside>
    </div>
  );
}