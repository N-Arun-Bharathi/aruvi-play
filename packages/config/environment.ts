export const IS_DEV = process.env.NODE_ENV !== "production";
export const SUPABASE_URL = (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_URL) || "https://bkluiuzuojqqnkvopmnw.supabase.co";
export const SUPABASE_ANON_KEY = (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) || "sb_publishable_xkrhoN_MOl6CWAEjNcLbbw_OQkO5tMj";
