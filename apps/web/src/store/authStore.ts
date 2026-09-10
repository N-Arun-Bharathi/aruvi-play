import { create } from "zustand";
import { supabase, AuthState, UserProfile } from "@aruvi/shared";
import { useToastStore } from "./toastStore";
import { useLikedStore } from "./likedStore";

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
let authListenerAttached = false;

const checkIsAdmin = (email?: string | null, isOwner?: boolean | null, metadata?: any): boolean => {
  if (email && email.toLowerCase().trim() === "arunabi6483@gmail.com") return true;
  if (isOwner === true) return true;
  if (metadata?.role === "admin" || metadata?.is_owner === true || metadata?.is_admin === true) return true;
  return false;
};

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

    // Setup Supabase auth state change listener once
    if (!authListenerAttached) {
      authListenerAttached = true;
      try {
        supabase.auth.onAuthStateChange(async (event: string, session: any) => {
          if (event === "SIGNED_IN" && session?.user && !session.user.is_anonymous) {
            useLikedStore.getState().hydrate().catch(console.warn);
          } else if (event === "SIGNED_OUT") {
            useLikedStore.getState().clearLiked();
          }
        });
      } catch (e) {}
    }

    try {
      // 1. Check live Supabase auth session first
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session?.user && !session.user.is_anonymous) {
        const user = session.user;
        let profileName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Aruvi User";
        let isOwnerFromDb = false;

        try {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, is_owner")
            .eq("id", user.id)
            .maybeSingle();

          if (dbProfile?.display_name) {
            profileName = dbProfile.display_name;
          }
          if (dbProfile?.is_owner) {
            isOwnerFromDb = true;
          }
        } catch (e) {}

        const isAdmin = checkIsAdmin(user.email, isOwnerFromDb, user.user_metadata);

        const profile: UserProfile = {
          id: user.id,
          name: profileName,
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || null,
          is_owner: isAdmin,
          isAdmin: isAdmin,
          is_guest: false,
        };

        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
        set({ authMode: "authenticated", userProfile: profile, loading: false });
        useLikedStore.getState().hydrate().catch(console.warn);
        return;
      }

      // 2. Check stored user profile in browser localStorage
      const storedUser = localStorage.getItem(AUTH_USER_KEY);
      if (storedUser) {
        try {
          const parsedUser: UserProfile = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            const isAdmin = checkIsAdmin(parsedUser.email, parsedUser.is_owner || parsedUser.isAdmin);
            const enrichedUser = { ...parsedUser, is_owner: isAdmin, isAdmin: isAdmin };
            const mode: AuthState = enrichedUser.is_guest ? "guest" : "authenticated";
            set({ authMode: mode, userProfile: enrichedUser, loading: false });
            if (!enrichedUser.is_guest) {
              useLikedStore.getState().hydrate().catch(console.warn);
            }
            return;
          }
        } catch (e) {
          console.warn("Failed to parse stored user profile:", e);
        }
      }

      // 3. Default to Guest Mode if no session or stored user exists
      const defaultGuest: UserProfile = {
        id: `guest_${Math.random().toString(36).substring(2, 9)}`,
        name: "Guest Listener",
        is_guest: true,
      };
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(defaultGuest));
      set({ authMode: "guest", userProfile: defaultGuest, loading: false });
    } catch (err) {
      console.error("Auth hydration error:", err);
      const defaultGuest: UserProfile = {
        id: `guest_${Math.random().toString(36).substring(2, 9)}`,
        name: "Guest Listener",
        is_guest: true,
      };
      set({ authMode: "guest", userProfile: defaultGuest, loading: false });
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
      let profileName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Aruvi User";
      let isOwnerFromDb = false;

      try {
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, is_owner")
          .eq("id", user.id)
          .maybeSingle();

        if (dbProfile?.display_name) {
          profileName = dbProfile.display_name;
        }
        if (dbProfile?.is_owner) {
          isOwnerFromDb = true;
        }
      } catch (e) {}

      const isAdmin = checkIsAdmin(user.email, isOwnerFromDb, user.user_metadata);

      const profile: UserProfile = {
        id: user.id,
        name: profileName,
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url || null,
        is_owner: isAdmin,
        isAdmin: isAdmin,
        is_guest: false,
      };

      // Save authenticated profile permanently in browser storage
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));

      set({ authMode: "authenticated", userProfile: profile, loading: false, isAuthModalOpen: false });
      toast.show(`Welcome back, ${profile.name}!`, "success");

      // Synchronize Liked Songs immediately
      useLikedStore.getState().hydrate().catch(console.warn);

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
        const isAdmin = checkIsAdmin(email, false);
        await supabase.from("profiles").upsert({
          id: data.user.id,
          display_name: displayName,
          is_owner: isAdmin,
          created_at: new Date().toISOString(),
        }).catch(console.warn);

        const profile: UserProfile = {
          id: data.user.id,
          name: displayName,
          email,
          is_owner: isAdmin,
          isAdmin: isAdmin,
          is_guest: false,
        };

        // Save authenticated profile permanently in browser storage
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));

        set({ authMode: "authenticated", userProfile: profile, loading: false, isAuthModalOpen: false });
        toast.show(`Account created! Welcome to Aruvi Play, ${displayName}!`, "success");

        // Synchronize Liked Songs immediately
        useLikedStore.getState().hydrate().catch(console.warn);

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
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(defaultGuest));
    set({ authMode: "guest", userProfile: defaultGuest, isAuthModalOpen: false });
    useToastStore.getState().show("Continuing in Guest Mode");
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
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
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
    useLikedStore.getState().clearLiked();
    const defaultGuest: UserProfile = {
      id: `guest_${Math.random().toString(36).substring(2, 9)}`,
      name: "Guest Listener",
      is_guest: true,
    };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(defaultGuest));
    set({ authMode: "guest", userProfile: defaultGuest });
    useToastStore.getState().show("Logged out. Switched to Guest Mode.");
  },
}));
