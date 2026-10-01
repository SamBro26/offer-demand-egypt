import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Trash2 } from "lucide-react";
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
import { adminBanListingOwner, adminDeleteListing } from "@/lib/moderation.functions";

type Action = "delete" | "ban" | null;

export function AdminActionButtons({ listingId, canBan }: { listingId: string; canBan: boolean }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action>(null);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] }),
      queryClient.invalidateQueries({ queryKey: ["listings"] }),
    ]);
  };
  const remove = useMutation({
    mutationFn: () => adminDeleteListing({ data: { listingId } }),
    onSuccess: () => { toast.success("تم حذف الإعلان"); refresh(); },
    onError: () => toast.error("تعذّر حذف الإعلان"),
  });
  const ban = useMutation({
    mutationFn: () => adminBanListingOwner({ data: { listingId } }),
    onSuccess: () => { toast.success("تم حظر الحساب وأرشفة إعلاناته"); refresh(); },
    onError: () => toast.error("تعذّر حظر الحساب"),
  });
  const confirm = () => {
    if (action === "delete") remove.mutate();
    if (action === "ban") ban.mutate();
    setAction(null);
  };
  const busy = remove.isPending || ban.isPending;
  return (
    <>
      <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => setAction("delete")}>
        <Trash2 /> حذف
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!canBan || busy} onClick={() => setAction("ban")}>
        <Ban /> حظر المستخدم
      </Button>
      <AlertDialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <AlertDialogContent dir="rtl" className="max-w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>{action === "delete" ? "حذف الإعلان؟" : "حظر هذا الحساب؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {action === "delete"
                ? "سيُحذف الإعلان ومحادثاته وبلاغاته نهائيًا. لا يمكن التراجع عن هذا الإجراء."
                : "سيُمنع المستخدم من الدخول وتُؤرشف جميع إعلاناته المنشورة فورًا."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}