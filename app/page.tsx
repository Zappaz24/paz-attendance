import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function HomePage() {
  redirect(isSupabaseConfigured() ? "/dashboard" : "/setup");
}
