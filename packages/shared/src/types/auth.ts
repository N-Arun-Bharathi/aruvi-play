export type AuthState = "loading" | "unauthenticated" | "guest" | "authenticated";

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_owner?: boolean;
  isAdmin?: boolean;
  is_guest: boolean;
  initial_likes_imported?: boolean;
}
