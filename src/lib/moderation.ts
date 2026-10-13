import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getAdminStatus, listAdminReports, listAdminUsers } from "@/lib/moderation.functions";

export const adminStatusQuery = (enabled: boolean) =>
  queryOptions({
    queryKey: ["admin-status"],
    queryFn: () => getAdminStatus(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

export const adminReportsQuery = queryOptions({
  queryKey: ["admin-reports"],
  queryFn: () => listAdminReports(),
});

export const adminUsersQuery = queryOptions({ queryKey: ["admin-users"], queryFn: () => listAdminUsers() });

export const supportMessagesQuery = queryOptions({
  queryKey: ["support-messages"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("id, sender_email, body, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

/** Broadcast notifications, polled for signed-in users. */
export const systemNotificationsQuery = (enabled: boolean) =>
  queryOptions({
    queryKey: ["system-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_notifications")
        .select("id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled,
    refetchInterval: 30_000,
  });

export type AdminReport = Awaited<ReturnType<typeof listAdminReports>>[number];
export type AdminUser = Awaited<ReturnType<typeof listAdminUsers>>[number];
