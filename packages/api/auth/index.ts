import { supabase } from "../../shared/src/services/supabase";

export async function loginUser(email: string, pass: string) {
  return await supabase.auth.signInWithPassword({ email, password: pass });
}
