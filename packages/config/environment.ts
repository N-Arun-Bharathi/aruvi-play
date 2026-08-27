export const IS_DEV = process.env.NODE_ENV !== "production";
export const SUPABASE_URL = (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_URL) || "https://your-supabase-project.supabase.co";
export const SUPABASE_ANON_KEY = (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.FakeKeyPlaceholder123456789";
