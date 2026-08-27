import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";

interface SettingsState {
  languages: string[];
  theme: "system" | "dark" | "light";
  audioQuality: "high" | "medium" | "low";
  autoplay: boolean;
  explicitContent: boolean;
  crossfade: number;
  downloadQuality: "high" | "medium" | "low";
  
  setLanguages: (langs: string[]) => Promise<void>;
  setTheme: (theme: "system" | "dark" | "light") => Promise<void>;
  setAudioQuality: (quality: "high" | "medium" | "low") => Promise<void>;
  setAutoplay: (enabled: boolean) => Promise<void>;
  setExplicitContent: (enabled: boolean) => Promise<void>;
  setCrossfade: (seconds: number) => Promise<void>;
  setDownloadQuality: (quality: "high" | "medium" | "low") => Promise<void>;
  hydrate: () => Promise<void>;
  syncWithSupabase: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  languages: ["tamil"],
  theme: "dark",
  audioQuality: "high",
  autoplay: true,
  explicitContent: true,
  crossfade: 0,
  downloadQuality: "high",

  setLanguages: async (langs) => {
    set({ languages: langs });
    await AsyncStorage.setItem("aruvi:languages", JSON.stringify(langs));
    await get().syncWithSupabase();
  },
  setTheme: async (theme) => {
    set({ theme });
    await AsyncStorage.setItem("aruvi:theme", theme);
    await get().syncWithSupabase();
  },
  setAudioQuality: async (audioQuality) => {
    set({ audioQuality });
    await AsyncStorage.setItem("aruvi:audio_quality", audioQuality);
  },
  setAutoplay: async (autoplay) => {
    set({ autoplay });
    await AsyncStorage.setItem("aruvi:autoplay", JSON.stringify(autoplay));
  },
  setExplicitContent: async (explicitContent) => {
    set({ explicitContent });
    await AsyncStorage.setItem("aruvi:explicit_content", JSON.stringify(explicitContent));
  },
  setCrossfade: async (crossfade) => {
    set({ crossfade });
    await AsyncStorage.setItem("aruvi:crossfade", JSON.stringify(crossfade));
  },
  setDownloadQuality: async (downloadQuality) => {
    set({ downloadQuality });
    await AsyncStorage.setItem("aruvi:download_quality", downloadQuality);
  },
  hydrate: async () => {
    try {
      const languages = await AsyncStorage.getItem("aruvi:languages");
      const theme = await AsyncStorage.getItem("aruvi:theme");
      const audioQuality = await AsyncStorage.getItem("aruvi:audio_quality");
      const autoplay = await AsyncStorage.getItem("aruvi:autoplay");
      const explicitContent = await AsyncStorage.getItem("aruvi:explicit_content");
      const crossfade = await AsyncStorage.getItem("aruvi:crossfade");
      const downloadQuality = await AsyncStorage.getItem("aruvi:download_quality");

      set({
        languages: languages ? JSON.parse(languages) : ["tamil"],
        theme: (theme as any) || "dark",
        audioQuality: (audioQuality as any) || "high",
        autoplay: autoplay ? JSON.parse(autoplay) : true,
        explicitContent: explicitContent ? JSON.parse(explicitContent) : true,
        crossfade: crossfade ? JSON.parse(crossfade) : 0,
        downloadQuality: (downloadQuality as any) || "high",
      });

      // Hydrate profile table theme if user is online
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("theme, preferred_language")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          set({
            theme: (profile.theme as any) || get().theme,
            languages: profile.preferred_language ? [profile.preferred_language] : get().languages,
          });
        }
      }
    } catch (e) {
      console.warn("SettingsStore: Hydrate failed", e);
    }
  },
  syncWithSupabase: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from("profiles")
          .update({
            theme: get().theme,
            preferred_language: get().languages[0] || "tamil",
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id);
      }
    } catch (e) {
      console.warn("SettingsStore: Sync failed", e);
    }
  }
}));
