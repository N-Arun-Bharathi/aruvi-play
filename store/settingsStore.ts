import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  languages: string[];
  setLanguages: (langs: string[]) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  languages: ["tamil"],
  setLanguages: async (langs) => {
    set({ languages: langs });
    await AsyncStorage.setItem("aruvi:languages", JSON.stringify(langs));
  },
  hydrate: async () => {
    const raw = await AsyncStorage.getItem("aruvi:languages");
    if (raw) {
      set({ languages: JSON.parse(raw) });
    }
  },
}));
