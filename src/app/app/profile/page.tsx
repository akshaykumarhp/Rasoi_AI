import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  // Fall back to a blank profile if the row hasn't been created yet.
  const profile: Profile = data ?? {
    id: user!.id,
    name: "",
    language: "en",
    units: "metric",
    cuisines: [],
    diet: "non-vegetarian",
    health_flags: [],
    allergies: [],
    voice_enabled: false,
    voice_language: "en-US",
  };

  return (
    <div>
      <span className="eyebrow">Preferences</span>
      <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
        Your preferences
      </h1>
      <p className="mt-2 text-muted-foreground">
        We use these to personalize every recipe — units, cuisine, diet, and more.
      </p>
      <div className="mt-8">
        <ProfileForm initial={profile} email={user!.email ?? ""} />
      </div>
    </div>
  );
}
