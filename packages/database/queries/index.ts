import { supabase } from "../../shared/src/services/supabase";

export async function getProfile(userId: string) {
  return await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
}
