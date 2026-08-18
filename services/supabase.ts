import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase credentials loaded from Expo public environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://your-supabase-project.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItc3VwYWJhc2UtcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.FakeKeyPlaceholder123456789";

let supabase: any;
let useMockSupabase = false;

const isPlaceholder = SUPABASE_URL.includes("your-supabase-project") || SUPABASE_ANON_KEY.includes("FakeKey");

if (isPlaceholder) {
  console.log("Supabase placeholder keys detected. Operating in local simulation mode.");
  useMockSupabase = true;
  
  // Minimal mock client object that replicates the required supabase APIs without making actual API calls
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: "offline-user-id" } }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback: any) => {
        // Run once with mock values
        callback("INITIAL_SESSION", null);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          then: (cb: any) => cb({ data: [], error: null })
        }),
        order: () => Promise.resolve({ data: [], error: null }),
        then: (cb: any) => cb({ data: [], error: null })
      }),
      insert: (data: any) => Promise.resolve({ data, error: null }),
      update: (data: any) => ({ eq: () => Promise.resolve({ data, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      upsert: (data: any) => Promise.resolve({ data, error: null })
    })
  };
} else {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.warn("Supabase failed to initialize. Falling back to local simulation mode.", error);
    useMockSupabase = true;
    supabase = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInAnonymously: async () => ({ data: { user: { id: "offline-user-id" } }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
            then: (cb: any) => cb({ data: [], error: null })
          }),
          order: () => Promise.resolve({ data: [], error: null }),
          then: (cb: any) => cb({ data: [], error: null })
        }),
        insert: (data: any) => Promise.resolve({ data, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        upsert: (data: any) => Promise.resolve({ data, error: null })
      })
    };
  }
}

export async function ensureGuestSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return session;
    }

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.warn("Unable to start anonymous guest session:", error?.message);
      // Fallback guest signup strategy if anonymous auth is disabled on dashboard
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const guestEmail = `guest-${randomId}-${Date.now()}@aruvi-play.com`;
      const guestPassword = "AruviGuestUserPassword#5868";
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
      });
      if (!signUpErr && signUpData?.session) {
        return signUpData.session;
      }
      throw new Error(`Unable to start guest session: ${error?.message || "Auth error"}`);
    }

    if (!data?.session) {
      throw new Error("Guest session was not created.");
    }

    return data.session;
  } catch (err: any) {
    console.error("ensureGuestSession error:", err);
    throw err;
  }
}

const SECRET_KEY = (process.env.EXPO_PUBLIC_SECRET_KEY || "Aruvi5868").trim();

export async function verifySecretKeyOnBackend(code: string): Promise<boolean> {
  const cleanCode = code ? code.trim() : "";
  if (!cleanCode) return false;

  try {
    if (useMockSupabase || typeof supabase.rpc !== "function") {
      return cleanCode === SECRET_KEY;
    }
    const { data, error } = await supabase.rpc("verify_secret_key", {
      secret_code: cleanCode,
    });
    if (error) {
      console.warn("verify_secret_key RPC returned error, using security check fallback:", error.message);
      return cleanCode === SECRET_KEY;
    }
    return data === true;
  } catch (err) {
    console.warn("verifySecretKeyOnBackend exception:", err);
    return cleanCode === SECRET_KEY;
  }
}

export function isAnonymousUser(user: { is_anonymous?: boolean } | null | undefined): boolean {
  return user?.is_anonymous === true;
}

export { supabase, useMockSupabase };

