import { queryOptions } from "@tanstack/react-query";

import { getAdminStatus, listAdminReports } from "@/lib/moderation.functions";

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

export type AdminReport = Awaited<ReturnType<typeof listAdminReports>>[number];
import { listAdminUsers } from "@/lib/moderation.functions";
export const adminUsersQuery = queryOptions({ queryKey: ["admin-users"], queryFn: () => listAdminUsers() });
export type AdminUser = Awaited<ReturnType<typeof listAdminUsers>>[number];
