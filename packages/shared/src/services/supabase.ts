import { createClient } from "@supabase/supabase-js";

const getEnvVar = (...keys: string[]): string | undefined => {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
      const env = (import.meta as any).env;
      for (const k of keys) {
        if (env[k]) return env[k];
      }
    }
  } catch (e) {}

  try {
    if (typeof process !== "undefined" && process.env) {
      for (const k of keys) {
        if (process.env[k]) return process.env[k];
      }
    }
  } catch (e) {}

  return undefined;
};

const SUPABASE_URL = getEnvVar("EXPO_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_URL") || "https://your-supabase-project.supabase.co";
const SUPABASE_ANON_KEY = getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItc3VwYWJhc2UtcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.FakeKeyPlaceholder123456789";

let supabase: any;
let useMockSupabase = false;

const isPlaceholder = SUPABASE_URL.includes("your-supabase-project") || SUPABASE_ANON_KEY.includes("FakeKey");

const createMockSupabase = () => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInAnonymously: async () => ({
      data: { user: { id: "guest-offline-user", is_anonymous: true }, session: { user: { id: "guest-offline-user" } } },
      error: null,
    }),
    signInWithPassword: async ({ email, password }: any) => {
      const mockUser = {
        id: `user_${Math.random().toString(36).substring(2, 9)}`,
        email: email || "user@example.com",
        user_metadata: { display_name: (email || "User").split("@")[0] },
      };
      return {
        data: { user: mockUser, session: { user: mockUser, access_token: "mock-jwt" } },
        error: null,
      };
    },
    signUp: async ({ email, password, options }: any) => {
      const mockUser = {
        id: `user_${Math.random().toString(36).substring(2, 9)}`,
        email: email || "user@example.com",
        user_metadata: options?.data || { display_name: (email || "User").split("@")[0] },
      };
      return {
        data: { user: mockUser, session: { user: mockUser, access_token: "mock-jwt" } },
        error: null,
      };
    },
    resetPasswordForEmail: async (email: string) => ({ data: {}, error: null }),
    updateUser: async (attributes: any) => ({ data: { user: attributes }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (callback: any) => {
      callback("INITIAL_SESSION", null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
        then: (cb: any) => cb({ data: [], error: null }),
      }),
      or: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (cb: any) => cb({ data: [], error: null }),
    }),
    insert: (data: any) => Promise.resolve({ data, error: null }),
    update: (data: any) => ({ eq: () => Promise.resolve({ data, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    upsert: (data: any) => Promise.resolve({ data, error: null }),
  }),
  rpc: () => Promise.resolve({ data: true, error: null }),
});

if (isPlaceholder) {
  useMockSupabase = true;
  supabase = createMockSupabase();
} else {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    useMockSupabase = true;
    supabase = createMockSupabase();
  }
}

export async function ensureGuestSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
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

const SECRET_KEY = "Aruvi5868";

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
      return cleanCode === SECRET_KEY;
    }
    return data === true;
  } catch (err) {
    return cleanCode === SECRET_KEY;
  }
}

export function isAnonymousUser(user: { is_anonymous?: boolean } | null | undefined): boolean {
  return user?.is_anonymous === true;
}

export { supabase, useMockSupabase };
