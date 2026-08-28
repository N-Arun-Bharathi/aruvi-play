import { create } from "zustand";

interface SettingsStoreState {
  preferredLanguage: string;
  audioQuality: "128kbps" | "320kbps";
  setPreferredLanguage: (lang: string) => void;
  setAudioQuality: (quality: "128kbps" | "320kbps") => void;
}

const STORAGE_LANG_KEY = "aruvi_preferred_language";
const STORAGE_QUALITY_KEY = "aruvi_audio_quality";

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  preferredLanguage: localStorage.getItem(STORAGE_LANG_KEY) || "Tamil",
  audioQuality: (localStorage.getItem(STORAGE_QUALITY_KEY) as any) || "320kbps",

  setPreferredLanguage: (lang: string) => {
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch (e) {}
    set({ preferredLanguage: lang });
  },

  setAudioQuality: (quality) => {
    try {
      localStorage.setItem(STORAGE_QUALITY_KEY, quality);
    } catch (e) {}
    set({ audioQuality: quality });
  },
}));
