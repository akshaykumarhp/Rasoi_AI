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
      <h1 className="text-3xl font-extrabold text-stone-900 dark:text-stone-50">
        Your preferences
      </h1>
      <p className="mt-2 text-stone-500 dark:text-stone-400">
        We use these to personalize every recipe — units, cuisine, diet, and more.
      </p>
      <div className="mt-8">
        <ProfileForm initial={profile} email={user!.email ?? ""} />
      </div>
    </div>
  );
}
