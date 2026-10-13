import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listingInput = z.object({ listingId: z.string().uuid() });

async function requireAdmin(context: {
  supabase: {
    rpc: (name: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{
      data: boolean | null;
      error: { message: string } | null;
    }>;
  };
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw error;
    return { isAdmin: data === true };
  });

export const reportListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: listing, error: listingError } = await context.supabase
      .from("listings")
      .select("id, owner_id, status")
      .eq("id", data.listingId)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing || listing.status !== "published") throw new Error("Listing unavailable");
    if (listing.owner_id === context.userId) throw new Error("Cannot report your own listing");

    const { error } = await context.supabase.from("listing_reports").insert({
      listing_id: data.listingId,
      reporter_id: context.userId,
    });
    if (error?.code === "23505") return { created: false, alreadyReported: true };
    if (error) throw error;
    return { created: true, alreadyReported: false };
  });

export const listAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("listing_reports")
      .select("id, listing_id, reporter_id, status, created_at, listings(id, title, owner_id, status, property_type, kind, images)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminDeleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listingInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listing, error: readError } = await supabaseAdmin
      .from("listings")
      .select("images")
      .eq("id", data.listingId)
      .maybeSingle();
    if (readError) throw readError;
    if (!listing) return { deleted: false };

    const { error: messagesError } = await supabaseAdmin.from("messages").delete().eq("listing_id", data.listingId);
    if (messagesError) throw messagesError;
    const { error } = await supabaseAdmin.from("listings").delete().eq("id", data.listingId);
    if (error) throw error;
    if (listing.images.length > 0) {
      await supabaseAdmin.storage.from("listing-photos").remove(listing.images);
    }
    return { deleted: true };
  });

export const adminBanListingOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listingInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("owner_id")
      .eq("id", data.listingId)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing?.owner_id) throw new Error("Listing has no account owner");
    if (listing.owner_id === context.userId) throw new Error("Admins cannot ban themselves");

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(listing.owner_id, {
      ban_duration: "876000h",
    });
    if (banError) throw banError;

    const { error: logError } = await supabaseAdmin.from("user_bans").insert({
      user_id: listing.owner_id,
      banned_by: context.userId,
      reason: "مخالفة سياسات المنصة",
    });
    if (logError && logError.code !== "23505") throw logError;

    const { error: archiveError } = await supabaseAdmin
      .from("listings")
      .update({ status: "archived" })
      .eq("owner_id", listing.owner_id)
      .eq("status", "published");
    if (archiveError) throw archiveError;

    const { error: reportsError } = await supabaseAdmin
      .from("listing_reports")
      .update({
        status: "actioned",
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("listing_id", data.listingId);
    if (reportsError) throw reportsError;

    return { banned: true };
  });
const userInput = z.object({ userId: z.string().uuid() });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const ids = data.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }, { data: bans }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, account_type, agency_name").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin"),
      supabaseAdmin.from("user_bans").select("user_id").is("lifted_at", null),
    ]);
    const banned = new Set((bans ?? []).map((b) => b.user_id));
    const admins = new Set((roles ?? []).map((r) => r.user_id));
    return data.users.map((u) => {
      const p = profiles?.find((x) => x.id === u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        name: p?.agency_name || p?.full_name || "",
        accountType: (p?.account_type ?? "individual") as "individual" | "agency",
        isAdmin: admins.has(u.id),
        banned: banned.has(u.id),
        createdAt: u.created_at,
      };
    });
  });

export const adminSetUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => userInput.extend({ banned: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("Admins cannot ban themselves");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.banned ? "876000h" : "none",
    });
    if (error) throw error;
    if (data.banned) {
      const { error: logError } = await supabaseAdmin.from("user_bans").insert({ user_id: data.userId, banned_by: context.userId });
      if (logError && logError.code !== "23505") throw logError;
      await supabaseAdmin.from("listings").update({ status: "archived" }).eq("owner_id", data.userId).eq("status", "published");
    } else {
      await supabaseAdmin.from("user_bans").update({ lifted_at: new Date().toISOString(), lifted_by: context.userId })
        .eq("user_id", data.userId).is("lifted_at", null);
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => userInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("Admins cannot delete themselves");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = data.userId;
    const { data: files } = await supabaseAdmin.storage.from("listing-photos").list(userId, { limit: 1000 });
    if (files?.length) await supabaseAdmin.storage.from("listing-photos").remove(files.map((f) => `${userId}/${f.name}`));
    await supabaseAdmin.from("messages").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    const { data: owned } = await supabaseAdmin.from("listings").select("id").eq("owner_id", userId);
    const ownedIds = (owned ?? []).map((l) => l.id);
    if (ownedIds.length) {
      await supabaseAdmin.from("messages").delete().in("listing_id", ownedIds);
      await supabaseAdmin.from("listings").delete().in("id", ownedIds);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { ok: true };
  });
