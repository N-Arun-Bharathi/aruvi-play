import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import { dbSaveUser } from "../services/sqlite";
import { useToastStore } from "./toastStore";
import * as Linking from "expo-linking";

const checkIsAdmin = (isOwner?: boolean | null, metadata?: any) => {
  if (isOwner === true) return true;
  if (metadata?.role === "admin" || metadata?.is_owner === true || metadata?.is_admin === true) return true;
  return false;
};

// Central auth state — resolved once at startup
export type AuthState = "loading" | "unauthenticated" | "guest" | "authenticated";

/** @deprecated Use AuthState */
export type AuthMode = AuthState;

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_owner: boolean;
  isAdmin: boolean;
  is_guest: boolean;
  initial_likes_imported?: boolean;
}

interface AuthStoreState {
  authMode: AuthState;
  userProfile: UserProfile | null;
  secretKeyUnlocked: boolean;

  hydrate: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  continueAsGuest: () => Promise<void>;
  upgradeGuestAccount: (credentials: { email: string; password: string; saveFavourites?: boolean }) => Promise<boolean>;
  updateGuestDisplayName: (name: string) => Promise<boolean>;
  verifyAndUnlockSecretKey: (code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const isValidUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Hydrate liked songs for authenticated users only */
async function hydrateLibrary() {
  try {
    const { useLibraryStore } = require("./likedStore");
    await useLibraryStore.getState().hydrate();
  } catch (e) {
    console.warn("Library hydration skipped:", e);
  }
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  authMode: "loading",
  userProfile: null,
  secretKeyUnlocked: false,

  // ─── HYDRATE ─────────────────────────────────────────────────
  hydrate: async () => {
    try {
      const unlockedStr = await AsyncStorage.getItem("aruvi:secret_unlocked").catch(() => null);
      const secretKeyUnlocked = unlockedStr === "true";
      set({ secretKeyUnlocked });

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session?.user) {
        const user = session.user;
        // Reject anonymous sessions — we no longer use them
        if (user.is_anonymous === true) {
          await supabase.auth.signOut().catch(() => {});
          set({ authMode: "unauthenticated", userProfile: null });
          return;
        }

        let profileData: UserProfile | null = null;
        try {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("id, display_name, phone, avatar_url, is_owner, initial_likes_imported, is_guest")
            .eq("id", user.id)
            .single();

          if (dbProfile) {
            const isAdmin = checkIsAdmin(dbProfile.is_owner, user.user_metadata);
            profileData = {
              id: user.id,
              name: dbProfile.display_name || user.email?.split("@")[0] || "Aruvi User",
              email: user.email,
              phone: user.phone || dbProfile.phone,
              avatar_url: dbProfile.avatar_url,
              is_owner: isAdmin,
              isAdmin: isAdmin,
              is_guest: false,
              initial_likes_imported: dbProfile.initial_likes_imported || false,
            };
          }
        } catch (_) {}

        if (!profileData) {
          const isAdmin = checkIsAdmin(false, user.user_metadata);
          profileData = {
            id: user.id,
            name: user.email?.split("@")[0] || "Aruvi User",
            email: user.email,
            phone: user.phone,
            avatar_url: null,
            is_owner: isAdmin,
            isAdmin: isAdmin,
            is_guest: false,
            initial_likes_imported: false,
          };
          await supabase.from("profiles").upsert({
            id: user.id,
            display_name: profileData.name,
            is_guest: false,
          });
        }

        await dbSaveUser(profileData);
        await AsyncStorage.setItem("aruvi:user", JSON.stringify(profileData));
        set({ authMode: "authenticated", userProfile: profileData });
        hydrateLibrary();
        return;
      }

      // No live session yet → Restore persistent local user (both registered & guest)
      const localUserStr = await AsyncStorage.getItem("aruvi:user");
      if (localUserStr) {
        try {
          const localUser = JSON.parse(localUserStr);
          if (localUser && localUser.id) {
            const isAdmin = checkIsAdmin(localUser.isAdmin || localUser.is_owner);
            const updatedUser = { ...localUser, is_owner: isAdmin, isAdmin: isAdmin };
            const mode = localUser.is_guest ? "guest" : "authenticated";
            set({ authMode: mode, userProfile: updatedUser });
            hydrateLibrary();
            return;
          }
        } catch (e) {
          console.warn("Failed to parse local user JSON");
        }
      }

      set({ authMode: "unauthenticated", userProfile: null });
    } catch (e) {
      console.error("AuthStore hydrate error:", e);
      set({ authMode: "unauthenticated", userProfile: null });
    }
  },

  // ─── LOGIN ───────────────────────────────────────────────────
  loginWithEmail: async (email: string, password: string) => {
    const toast = useToastStore.getState();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      toast.show("Please enter email and password.");
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        toast.show(`Login failed: ${error.message}`);
        return false;
      }

      if (data?.user) {
        const user = data.user;
        let profile: UserProfile = {
          id: user.id,
          name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Aruvi User",
          email: user.email,
          phone: user.phone,
          avatar_url: null,
          is_owner: false,
          isAdmin: false,
          is_guest: false,
        };

        try {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("id, display_name, phone, avatar_url, is_owner, initial_likes_imported, is_guest")
            .eq("id", user.id)
            .single();
          if (dbProfile) {
            const isAdmin = checkIsAdmin(dbProfile.is_owner, user.user_metadata);
            profile = {
              ...profile,
              name: dbProfile.display_name || profile.name,
              avatar_url: dbProfile.avatar_url,
              is_owner: isAdmin,
              isAdmin: isAdmin,
              initial_likes_imported: dbProfile.initial_likes_imported || false,
            };
          }
        } catch (_) {}

        await dbSaveUser(profile);
        await AsyncStorage.setItem("aruvi:user", JSON.stringify(profile));
        set({ authMode: "authenticated", userProfile: profile });
        toast.show("Welcome back!");
        hydrateLibrary();
        return true;
      }
      return false;
    } catch (err: any) {
      toast.show(err.message || "Failed to log in.");
      return false;
    }
  },

  // ─── SIGN UP ─────────────────────────────────────────────────
  signUpWithEmail: async (email: string, password: string, displayName: string) => {
    const toast = useToastStore.getState();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanName = displayName.trim() || "Aruvi User";

    if (!cleanEmail || !cleanPass) {
      toast.show("Please enter email and password.");
      return false;
    }
    if (cleanPass.length < 6) {
      toast.show("Password must be at least 6 characters.");
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: { display_name: cleanName },
          emailRedirectTo: Linking.createURL("/auth"),
        },
      });

      if (error) {
        toast.show(`Sign up failed: ${error.message}`);
        return false;
      }

      if (data?.user) {
        const user = data.user;
        const isAdmin = checkIsAdmin(false, user.user_metadata);
        const profile: UserProfile = {
          id: user.id,
          name: cleanName,
          email: user.email,
          phone: user.phone,
          avatar_url: null,
          is_owner: isAdmin,
          isAdmin: isAdmin,
          is_guest: false,
        };

        await supabase.from("profiles").upsert({
          id: user.id,
          display_name: cleanName,
          is_guest: false,
          updated_at: new Date().toISOString(),
        });

        await dbSaveUser(profile);

        if (!data.session) {
          // Email confirmation is required
          toast.show("Please check your email to verify your account.");
          return true;
        }

        await AsyncStorage.setItem("aruvi:user", JSON.stringify(profile));
        set({ authMode: "authenticated", userProfile: profile });
        toast.show("Account created successfully!");
        hydrateLibrary();
        return true;
      }
      return false;
    } catch (err: any) {
      toast.show(err.message || "Failed to create account.");
      return false;
    }
  },

  // ─── RESET PASSWORD ──────────────────────────────────────────
  resetPassword: async (email: string) => {
    const toast = useToastStore.getState();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.show("Please enter your email address.");
      return false;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: Linking.createURL("/auth"),
      });
      if (error) {
        toast.show(`Password reset error: ${error.message}`);
        return false;
      }
      toast.show("Password reset instructions sent to your email!");
      return true;
    } catch (err: any) {
      toast.show(err.message || "Failed to send reset email.");
      return false;
    }
  },

  // ─── UPDATE PASSWORD ─────────────────────────────────────────
  updatePassword: async (password: string) => {
    const toast = useToastStore.getState();
    const cleanPass = password.trim();
    if (cleanPass.length < 6) {
      toast.show("Password must be at least 6 characters.");
      return false;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: cleanPass });
      if (error) {
        toast.show(`Failed to update password: ${error.message}`);
        return false;
      }
      toast.show("Password updated successfully!");
      return true;
    } catch (err: any) {
      toast.show(err.message || "Failed to update password.");
      return false;
    }
  },

  // ─── CONTINUE AS GUEST ── local only, no Supabase call ───────
  continueAsGuest: async () => {
    // Attempt to keep existing guest profile if present
    const localUserStr = await AsyncStorage.getItem("aruvi:user").catch(() => null);
    let guestProfile: UserProfile | null = null;
    
    if (localUserStr) {
      try {
        const localUser = JSON.parse(localUserStr);
        if (localUser.is_guest) {
          guestProfile = localUser;
        }
      } catch(e) {}
    }

    if (!guestProfile) {
      guestProfile = {
        id: "local-guest",
        name: `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
        is_owner: false,
        isAdmin: false,
        is_guest: true,
      };
    }
    
    await AsyncStorage.setItem("aruvi:user", JSON.stringify(guestProfile));
    set({ authMode: "guest", userProfile: guestProfile });
  },

  // ─── UPGRADE GUEST ACCOUNT ───────────────────────────────────
  upgradeGuestAccount: async (credentials) => {
    const toast = useToastStore.getState();
    const { userProfile } = get();

    const cleanEmail = credentials.email.trim();
    const cleanPass = credentials.password.trim();

    if (!cleanEmail || !cleanPass) {
      toast.show("Please provide email and password.");
      return false;
    }

    try {
      let authUser: any = null;

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: { display_name: userProfile?.name || "Aruvi User" },
          emailRedirectTo: Linking.createURL("/auth"),
        },
      });

      if (signUpData?.user) {
        authUser = signUpData.user;
      } else if (signUpErr) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass,
        });
        if (signInData?.user) {
          authUser = signInData.user;
        } else {
          toast.show(`Account save failed: ${signUpErr.message}`);
          return false;
        }
      }

      const registeredProfile: UserProfile = {
        id: authUser?.id || "unknown",
        name: userProfile?.name || "Aruvi User",
        email: cleanEmail,
        is_owner: false,
        isAdmin: false,
        is_guest: false,
      };

      if (isValidUuid(registeredProfile.id)) {
        await supabase.from("profiles").upsert({
          id: registeredProfile.id,
          display_name: registeredProfile.name,
          is_guest: false,
          updated_at: new Date().toISOString(),
        });
      }

      await dbSaveUser(registeredProfile);
      await AsyncStorage.setItem("aruvi:user", JSON.stringify(registeredProfile));
      set({ authMode: "authenticated", userProfile: registeredProfile });
      toast.show("Account successfully saved!");
      hydrateLibrary();
      return true;
    } catch (err: any) {
      toast.show(err.message || "Failed to save account.");
      return false;
    }
  },

  // ─── UPDATE DISPLAY NAME ─────────────────────────────────────
  updateGuestDisplayName: async (name: string) => {
    const toast = useToastStore.getState();
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 40) {
      toast.show("Display name must be between 2 and 40 characters.");
      return false;
    }

    const { userProfile } = get();
    if (!userProfile) return false;

    const updatedProfile = { ...userProfile, name: cleanName };

    if (isValidUuid(userProfile.id)) {
      try {
        await supabase.from("profiles").update({
          display_name: cleanName,
          updated_at: new Date().toISOString(),
        }).eq("id", userProfile.id);
      } catch (_) {}
    }

    await dbSaveUser(updatedProfile);
    await AsyncStorage.setItem("aruvi:user", JSON.stringify(updatedProfile));
    set({ userProfile: updatedProfile });
    toast.show("Display name updated!");
    return true;
  },


  // ─── VERIFY AND UNLOCK SECRET KEY ───────────────────────────
  verifyAndUnlockSecretKey: async (code: string) => {
    const toast = useToastStore.getState();
    const cleanCode = code ? code.trim() : "";
    if (!cleanCode) {
      toast.show("Please enter a secret key.");
      return { success: false, message: "Please enter a secret key." };
    }

    try {
      const { verifySecretKeyOnBackend } = require("../services/supabase");
      const isValid = await verifySecretKeyOnBackend(cleanCode);

      if (isValid) {
        await AsyncStorage.setItem("aruvi:secret_unlocked", "true");
        set({ secretKeyUnlocked: true });
        hydrateLibrary();
        toast.show("Secret access granted!");
        return { success: true };
      } else {
        toast.show("Invalid secret code. Please try again.");
        return { success: false, message: "Invalid secret code. Please try again." };
      }
    } catch (err: any) {
      toast.show("Failed to verify secret code.");
      return { success: false, message: "Failed to verify secret code." };
    }
  },

  // ─── LOGOUT ──────────────────────────────────────────────────
  logout: async () => {
    const toast = useToastStore.getState();
    const wasGuest = get().userProfile?.is_guest;

    try {
      await supabase.auth.signOut();
    } catch (_) {}

    try {
      const { useLibraryStore } = require("./likedStore");
      useLibraryStore.getState().clearGuestFavourites();
    } catch (_) {}

    await AsyncStorage.removeItem("aruvi:user");
    await AsyncStorage.removeItem("aruvi:secret_unlocked");
    set({ authMode: "unauthenticated", userProfile: null, secretKeyUnlocked: false });
    toast.show(wasGuest ? "Guest session ended." : "Logged out.");
  },
}));
