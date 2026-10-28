import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Server-side guard used by every protected page and mutating action.
 * The proxy only does an optimistic redirect; this is the authoritative check
 * that also confirms the caller has the admin role.
 *
 * Wrapped in React `cache()` so the layout and the page share one auth round
 * trip per request.
 */
export const requireAdmin = cache(async (): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  profile: Profile;
}> => {
  if (!isSupabaseConfigured()) redirect("/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/login?error=not-admin");
  }

  return { supabase, user, profile };
});
