import { create } from "zustand";

interface SettingsStoreState {
  preferredLanguage: string;
  languages: string[];
  audioQuality: "96kbps" | "160kbps" | "320kbps";
  autoplay: boolean;
  setPreferredLanguage: (lang: string) => void;
  setLanguages: (languages: string[]) => void;
  setAudioQuality: (quality: "96kbps" | "160kbps" | "320kbps") => void;
  setAutoplay: (enabled: boolean) => void;
}

const STORAGE_LANG_KEY = "aruvi_preferred_language";
const STORAGE_LANGUAGES_KEY = "aruvi_languages";
const STORAGE_QUALITY_KEY = "aruvi_audio_quality";
const STORAGE_AUTOPLAY_KEY = "aruvi_autoplay";

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  preferredLanguage: localStorage.getItem(STORAGE_LANG_KEY) || "Tamil",
  languages: (() => {
    try {
      const raw = localStorage.getItem(STORAGE_LANGUAGES_KEY);
      return raw ? JSON.parse(raw) : ["Tamil"];
    } catch {
      return ["Tamil"];
    }
  })(),
  audioQuality: (localStorage.getItem(STORAGE_QUALITY_KEY) as any) || "320kbps",
  autoplay: localStorage.getItem(STORAGE_AUTOPLAY_KEY) !== "false",

  setPreferredLanguage: (lang: string) => {
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch (e) {}
    set({ preferredLanguage: lang });
  },

  setLanguages: (languages: string[]) => {
    try {
      localStorage.setItem(STORAGE_LANGUAGES_KEY, JSON.stringify(languages));
    } catch (e) {}
    set({ languages });
  },

  setAudioQuality: (quality) => {
    try {
      localStorage.setItem(STORAGE_QUALITY_KEY, quality);
    } catch (e) {}
    set({ audioQuality: quality });
  },

  setAutoplay: (enabled) => {
    try {
      localStorage.setItem(STORAGE_AUTOPLAY_KEY, String(enabled));
    } catch (e) {}
    set({ autoplay: enabled });
  },
}));
