import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import CookClient from "./CookClient";

export default async function CookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const profile = (data ?? {
    id: user!.id,
    language: "en",
    voice_language: "en-US",
    voice_enabled: false,
  }) as Profile;

  return <CookClient profile={profile} />;
}
