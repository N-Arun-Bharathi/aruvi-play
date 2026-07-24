import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import { dbSaveUser } from "../services/sqlite";
import { useToastStore } from "./toastStore";

interface AuthState {
  authenticated: boolean;
  loading: boolean;
  userProfile: any | null;

  hydrate: () => Promise<void>;
  elevateToAdmin: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Static local owner profile to support offline-first features
const localOwnerProfile = {
  id: "local-owner-user-id",
  phone: "+917806885868",
  name: "Aruvi User",
  avatar_url: null,
  is_owner: false,
  initial_likes_imported: false,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  authenticated: false,
  loading: true,
  userProfile: null,

  hydrate: async () => {
    try {
      // 1. Get active session
      let { data: { session } } = await supabase.auth.getSession();
      
      // 2. If no session exists, log in silently in the background
      if (!session) {
        console.log("AuthStore: No session found. Performing silent anonymous sign-in...");
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }

      if (session?.user) {
        const user = session.user;
        
        // Load stored profile override if active
        const storedProfileRaw = await AsyncStorage.getItem("aruvi:user_profile_override");
        let profileOverride = storedProfileRaw ? JSON.parse(storedProfileRaw) : null;

        // If no override exists, fetch from profile database table
        if (!profileOverride) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          profileOverride = {
            id: user.id,
            name: profile?.display_name || "Aruvi User",
            is_owner: profile?.is_owner || false,
            initial_likes_imported: profile?.initial_likes_imported || false,
          };
        }

        await dbSaveUser(profileOverride);
        await AsyncStorage.setItem("aruvi:authenticated", "true");
        await AsyncStorage.setItem("aruvi:user", JSON.stringify(profileOverride));

        set({ authenticated: true, userProfile: profileOverride, loading: false });
      } else {
        set({ authenticated: false, userProfile: null, loading: false });
      }
    } catch (e) {
      console.error("AuthStore silent hydrate error:", e);
      // Fallback to offline profile
      set({ authenticated: true, userProfile: localOwnerProfile, loading: false });
    }
  },

  elevateToAdmin: async (code: string) => {
    const toast = useToastStore.getState();
    const { userProfile } = get();
    if (!userProfile) return false;

    if (code.trim() === "5868") {
      const updatedProfile = {
        ...userProfile,
        name: "Aruvi Admin",
        is_owner: true,
        initial_likes_imported: false, // Set to false to trigger likes migration in library
      };

      await dbSaveUser(updatedProfile);
      await AsyncStorage.setItem("aruvi:user_profile_override", JSON.stringify(updatedProfile));
      await AsyncStorage.setItem("aruvi:user", JSON.stringify(updatedProfile));

      set({ userProfile: updatedProfile });
      toast.show("Elevated to Admin Profile!");

      // Trigger liked store reload to import the assets list
      try {
        const { useLibraryStore } = require("./likedStore");
        await useLibraryStore.getState().hydrate();
      } catch (lhErr) {}

      return true;
    } else {
      // Revert to normal guest user
      const revertedProfile = {
        ...userProfile,
        name: "Aruvi User",
        is_owner: false,
        initial_likes_imported: false,
      };

      await dbSaveUser(revertedProfile);
      await AsyncStorage.removeItem("aruvi:user_profile_override");
      await AsyncStorage.setItem("aruvi:user", JSON.stringify(revertedProfile));

      set({ userProfile: revertedProfile });
      toast.show("Reverted to Normal Profile.");

      try {
        const { useLibraryStore } = require("./likedStore");
        // Clear likes on revert
        const { dbGetLikedSongs, dbRemoveLikedSong } = require("../services/sqlite");
        const current = await dbGetLikedSongs(revertedProfile.id);
        for (const s of current) {
          await dbRemoveLikedSong(revertedProfile.id, s.id);
        }
        await useLibraryStore.getState().hydrate();
      } catch (lhErr) {}

      return false;
    }
  },

  logout: async () => {
    // Disabled in silent mode
  }
}));
