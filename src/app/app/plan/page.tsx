import { createClient } from "@/lib/supabase/server";
import PlanClient from "./PlanClient";

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("meal_plans")
    .select("id, date, meal_type, title")
    .eq("user_id", user!.id);

  return <PlanClient userId={user!.id} initialEntries={entries ?? []} />;
}
