import { Link } from "@tanstack/react-router";

const itemClass =
  "flex flex-col items-center gap-1 rounded-2xl py-2.5 text-ink-soft transition-colors";
const activeClass = "bg-brand text-primary-foreground";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 px-4 pb-4">
      <div className="grid grid-cols-3 gap-1 rounded-3xl glass-panel-strong p-1.5">
        <Link to="/" className={itemClass} activeProps={{ className: `${itemClass} ${activeClass}` }}>
          <span className="text-[15px]">⌂</span>
          <span className="text-[9px] font-bold">الرئيسية</span>
        </Link>
        <Link
          to="/post"
          className={itemClass}
          activeProps={{ className: `${itemClass} ${activeClass}` }}
        >
          <span className="text-[15px]">＋</span>
          <span className="text-[9px] font-semibold">نشر</span>
        </Link>
        <Link
          to="/account"
          className={itemClass}
          activeProps={{ className: `${itemClass} ${activeClass}` }}
        >
          <span className="text-[15px]">◍</span>
          <span className="text-[9px] font-semibold">حسابي</span>
        </Link>
      </div>
    </nav>
  );
}
