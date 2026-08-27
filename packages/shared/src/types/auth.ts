export type AuthState = "loading" | "unauthenticated" | "guest" | "authenticated";

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_guest: boolean;
}
