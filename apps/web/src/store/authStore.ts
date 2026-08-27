import { create } from "zustand";
import { supabase, AuthState, UserProfile } from "@aruvi/shared";
import { useToastStore } from "./toastStore";

interface AuthStoreState {
  authMode: AuthState;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: "login" | "register" | "forgot";

  openAuthModal: (tab?: "login" | "register" | "forgot") => void;
  closeAuthModal: () => void;
  hydrate: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  continueAsGuest: () => void;
  updateProfileName: (newName: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AUTH_USER_KEY = "aruvi_user_profile";
const GUEST_USER_KEY = "aruvi_guest_user";

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  authMode: "loading",
  userProfile: null,
  loading: true,
  isAuthModalOpen: false,
  authModalTab: "login",

  openAuthModal: (tab = "login") => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  hydrate: async () => {
    set({ loading: true });
    try {
      // 1. Check persistent authenticated user profile in browser storage first
      const storedUser = localStorage.getItem(AUTH_USER_KEY);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id && !parsedUser.is_guest) {
            set({ authMode: "authenticated", userProfile: parsedUser, loading: false });
            return;
          }
        } catch (e) {
          console.warn("Failed to parse stored user profile:", e);
        }
      }

      // 2. Check Supabase auth session
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session?.user) {
        const user = session.user;
        let profileName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Aruvi User";

        try {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          if (dbProfile?.display_name) {
            profileName = dbProfile.display_name;
          }
        } catch (e) {}

        const profile: UserProfile = {
          id: user.id,
          name: profileName,
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || null,
          is_guest: false,
        };

        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
        localStorage.removeItem(GUEST_USER_KEY);
        set({ authMode: "authenticated", userProfile: profile, loading: false });
        return;
      }

      // 3. Check stored guest session
      const storedGuest = localStorage.getItem(GUEST_USER_KEY);
      if (storedGuest) {
        try {
          const parsed = JSON.parse(storedGuest);
          set({ authMode: "guest", userProfile: parsed, loading: false });
          return;
        } catch (e) {}
      }

      // 4. Default Guest Mode if no session exists
      const defaultGuest: UserProfile = {
        id: `guest_${Math.random().toString(36).substring(2, 9)}`,
        name: "Guest Listener",
        is_guest: true,
      };
      localStorage.setItem(GUEST_USER_KEY, JSON.stringify(defaultGuest));
      set({ authMode: "guest", userProfile: defaultGuest, loading: false });
    } catch (err) {
      console.error("Auth hydration error:", err);
      set({ authMode: "guest", userProfile: { id: "guest_user", name: "Guest Listener", is_guest: true }, loading: false });
    }
  },

  loginWithEmail: async (email, password) => {
    const toast = useToastStore.getState();
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.show(error.message, "error");
        set({ loading: false });
        return false;
      }

      const user = data.user;
      const profile: UserProfile = {
        id: user.id,
        name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Aruvi User",
        email: user.email,
        is_guest: false,
      };

      // Persist authenticated profile permanently in browser storage
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      localStorage.removeItem(GUEST_USER_KEY);

      set({ authMode: "authenticated", userProfile: profile, loading: false, isAuthModalOpen: false });
      toast.show(`Welcome back, ${profile.name}!`, "success");
      return true;
    } catch (err: any) {
      toast.show(err.message || "Failed to login", "error");
      set({ loading: false });
      return false;
    }
  },

  signUpWithEmail: async (email, password, displayName) => {
    const toast = useToastStore.getState();
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });

      if (error) {
        toast.show(error.message, "error");
        set({ loading: false });
        return false;
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          display_name: displayName,
          created_at: new Date().toISOString(),
        }).catch(console.warn);

        const profile: UserProfile = {
          id: data.user.id,
          name: displayName,
          email,
          is_guest: false,
        };

        // Persist authenticated profile permanently in browser storage
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
        localStorage.removeItem(GUEST_USER_KEY);

        set({ authMode: "authenticated", userProfile: profile, loading: false, isAuthModalOpen: false });
        toast.show(`Account created! Welcome to Aruvi Play, ${displayName}!`, "success");
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err: any) {
      toast.show(err.message || "Failed to sign up", "error");
      set({ loading: false });
      return false;
    }
  },

  resetPassword: async (email) => {
    const toast = useToastStore.getState();
    set({ loading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        toast.show(error.message, "error");
        set({ loading: false });
        return false;
      }
      toast.show("Password reset instructions sent to your email!", "success");
      set({ loading: false });
      return true;
    } catch (err: any) {
      toast.show(err.message || "Reset failed", "error");
      set({ loading: false });
      return false;
    }
  },

  continueAsGuest: () => {
    const defaultGuest: UserProfile = {
      id: `guest_${Math.random().toString(36).substring(2, 9)}`,
      name: "Guest Listener",
      is_guest: true,
    };
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(defaultGuest));
    set({ authMode: "guest", userProfile: defaultGuest, isAuthModalOpen: false });
    useToastStore.getState().show("Continuing as Guest");
  },

  updateProfileName: async (newName) => {
    const { userProfile } = get();
    if (!userProfile) return false;
    const cleanName = newName.trim();
    if (!cleanName) return false;

    try {
      if (!userProfile.is_guest) {
        await supabase.from("profiles").upsert({
          id: userProfile.id,
          display_name: cleanName,
        });
        await supabase.auth.updateUser({
          data: { display_name: cleanName },
        });
      }

      const updated = { ...userProfile, name: cleanName };
      if (userProfile.is_guest) {
        localStorage.setItem(GUEST_USER_KEY, JSON.stringify(updated));
      } else {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
      }
      set({ userProfile: updated });
      useToastStore.getState().show("Display name updated!", "success");
      return true;
    } catch (err: any) {
      useToastStore.getState().show("Failed to update profile", "error");
      return false;
    }
  },

  logout: async () => {
    await supabase.auth.signOut().catch(() => {});
    // Permanently remove authenticated profile only on explicit logout
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(GUEST_USER_KEY);

    const defaultGuest: UserProfile = {
      id: `guest_${Math.random().toString(36).substring(2, 9)}`,
      name: "Guest Listener",
      is_guest: true,
    };
    set({ authMode: "guest", userProfile: defaultGuest });
    useToastStore.getState().show("Logged out successfully");
  },
}));
