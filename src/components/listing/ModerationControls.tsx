import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Flag, MoreVertical, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth";
import { adminStatusQuery } from "@/lib/moderation";
import {
  adminBanListingOwner,
  adminDeleteListing,
  reportListing,
} from "@/lib/moderation.functions";

type ConfirmAction = "delete" | "ban" | null;

export function ModerationControls({ listingId, ownerId }: { listingId: string; ownerId: string | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useSession();
  const { data: admin } = useQuery(adminStatusQuery(Boolean(user)));
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const report = useMutation({
    mutationFn: () => reportListing({ data: { listingId } }),
    onSuccess: (result) => {
      toast.success(result.alreadyReported ? "سبق إرسال بلاغ عن هذا الإعلان" : "تم إرسال البلاغ للمراجعة");
    },
    onError: () => toast.error("تعذّر إرسال البلاغ"),
  });

  const remove = useMutation({
    mutationFn: () => adminDeleteListing({ data: { listingId } }),
    onSuccess: async () => {
      toast.success("تم حذف الإعلان");
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      navigate({ to: "/" });
    },
    onError: () => toast.error("تعذّر حذف الإعلان"),
  });

  const ban = useMutation({
    mutationFn: () => adminBanListingOwner({ data: { listingId } }),
    onSuccess: async () => {
      toast.success("تم حظر الحساب وأرشفة إعلاناته");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listing", listingId] }),
        queryClient.invalidateQueries({ queryKey: ["listings"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
      ]);
      navigate({ to: "/" });
    },
    onError: () => toast.error("تعذّر حظر الحساب"),
  });

  const busy = remove.isPending || ban.isPending;
  const confirm = () => {
    if (confirmAction === "delete") remove.mutate();
    if (confirmAction === "ban") ban.mutate();
    setConfirmAction(null);
  };

  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      {loading ? <span /> : user ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={report.isPending || ownerId === user.id}
          onClick={() => report.mutate()}
          className="text-ink-soft"
        >
          <Flag /> إبلاغ
        </Button>
      ) : (
        <Button asChild variant="ghost" size="sm" className="text-ink-soft">
          <Link to="/auth" search={{ next: `/listings/${listingId}` }}><Flag /> إبلاغ</Link>
        </Button>
      )}

      {admin?.isAdmin ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" aria-label="إجراءات الإدارة">
              <ShieldAlert /> إجراءات الإدارة <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => setConfirmAction("delete")} className="text-destructive">
              <Trash2 /> حذف الإعلان
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!ownerId} onSelect={() => setConfirmAction("ban")} className="text-destructive">
              <Ban /> حظر صاحب الإعلان
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent dir="rtl" className="max-w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>{confirmAction === "delete" ? "حذف الإعلان؟" : "حظر هذا الحساب؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? "سيُحذف الإعلان وبلاغاته نهائيًا. لا يمكن التراجع عن هذا الإجراء."
                : "سيُمنع صاحب الإعلان من الدخول وتُؤرشف جميع إعلاناته المنشورة فورًا."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={confirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}