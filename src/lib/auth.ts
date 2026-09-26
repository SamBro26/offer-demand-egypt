/** Auth module — current session as a shared query (invalidated from __root on auth changes). */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },
  staleTime: Infinity,
});

export function useSession() {
  const hydrated = useHydrated();
  const { data, isPending } = useQuery({ ...sessionQuery, enabled: hydrated });
  return { session: data ?? null, user: data?.user ?? null, loading: !hydrated || isPending };
}
