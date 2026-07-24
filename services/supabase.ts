import { createClient } from "@supabase/supabase-js";

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
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

export { supabase, useMockSupabase };
