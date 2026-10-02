/** Gate for entering the posting flow: signed-out users are alerted and sent to sign in first. */
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { useSession } from "@/lib/auth";

export const POST_LOGIN_MESSAGE = "الرجاء تسجيل الدخول لإضافة الإعلان";

export function usePostGate() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  /** Returns true when the caller may proceed into /post; otherwise redirects to sign-in. */
  return (next = "/post") => {
    if (loading) return false;
    if (user) return true;
    toast.error(POST_LOGIN_MESSAGE);
    navigate({ to: "/auth", search: { next } });
    return false;
  };
}
