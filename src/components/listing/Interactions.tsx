import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { likesQuery, ratingsQuery } from "@/lib/interactions";

function useRequireSignIn(listingId: string) {
  const navigate = useNavigate();
  const { user } = useSession();
  return () => {
    if (user) return user;
    toast("سجّل الدخول أولًا — الحساب مجاني");
    navigate({ to: "/auth", search: { next: `/listings/${listingId}` } });
    return null;
  };
}

/** 1–5 star rating; one rating per user, re-tapping updates it. */
export function StarRating({ listingId }: { listingId: string }) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const requireUser = useRequireSignIn(listingId);
  const { data } = useQuery(ratingsQuery(listingId, user?.id ?? null));
  const mine = data?.mine ?? 0;
  const average = data?.average ?? 0;
  const ratingCount = data?.count ?? 0;

  const rate = useMutation({
    mutationFn: async (stars: number) => {
      const current = requireUser();
      if (!current) return;
      const { error } = await supabase
        .from("listing_ratings")
        .upsert({ listing_id: listingId, user_id: current.id, stars });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ratings", listingId] }),
    onError: () => toast.error("تعذّر حفظ التقييم"),
  });

  return (
    <div>
      <div className="flex items-center gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} نجوم`}
            onClick={() => rate.mutate(star)}
            className={`text-[24px] leading-none transition-transform active:scale-90 ${
              star <= (mine || Math.round(average)) ? "text-star" : "text-ink-faint/40"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] font-medium text-ink-faint">
        {ratingCount ? `${average.toFixed(1)} من 5 · ${ratingCount} تقييم` : "لا توجد تقييمات بعد"}
        {mine ? ` · تقييمك ${mine}` : ""}
      </p>
    </div>
  );
}

/** Like toggle with live count. */
export function LikeButton({ listingId }: { listingId: string }) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const requireUser = useRequireSignIn(listingId);
  const { data: likes } = useQuery(likesQuery(listingId, user?.id ?? null));
  const liked = Boolean(user && likes?.liked);

  const toggle = useMutation({
    mutationFn: async () => {
      const current = requireUser();
      if (!current) return;
      const table = supabase.from("listing_likes");
      const { error } = liked
        ? await table.delete().eq("listing_id", listingId).eq("user_id", current.id)
        : await table.insert({ listing_id: listingId, user_id: current.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["likes", listingId] }),
    onError: () => toast.error("تعذّر تحديث الإعجاب"),
  });

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      aria-pressed={liked}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors ${
        liked ? "bg-like/15 text-like" : "bg-glass-strong text-ink-soft outline-1 outline-glass-edge"
      }`}
    >
      <span>{liked ? "❤️" : "👍"}</span>
      <span>{likes?.count ?? 0}</span>
    </button>
  );
}
