/** Account self-service server functions. */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently deletes the caller's account, their listings, messages and photos. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: files } = await supabaseAdmin.storage.from("listing-photos").list(userId, { limit: 1000 });
    if (files?.length) {
      await supabaseAdmin.storage.from("listing-photos").remove(files.map((f) => `${userId}/${f.name}`));
    }
    await supabaseAdmin.from("messages").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    await supabaseAdmin.from("listings").delete().eq("owner_id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("تعذّر حذف الحساب");
    return { ok: true };
  });
