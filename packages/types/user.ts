export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
  is_guest?: boolean;
}

export type AuthState = "authenticated" | "guest" | "loading";
