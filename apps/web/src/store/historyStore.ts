import { create } from "zustand";
import { Song, HistoryItem } from "@aruvi/shared";

interface HistoryState {
  history: HistoryItem[];
  addSongToHistory: (song: Song) => void;
  clearHistory: () => void;
  loadHistory: () => void;
}

const STORAGE_KEY = "aruvi_listening_history";

function getDateGroup(date: Date): "Today" | "Yesterday" | "Earlier this week" | "Older" {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "Earlier this week";
  return "Older";
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],

  loadHistory: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ history: JSON.parse(stored) });
      }
    } catch (e) {
      console.warn("Failed to load listening history:", e);
    }
  },

  addSongToHistory: (song: Song) => {
    const { history } = get();
    const now = new Date();
    const item: HistoryItem = {
      id: `${song.id}_${now.getTime()}`,
      song,
      played_at: now.toISOString(),
      date_group: getDateGroup(now),
    };

    // Filter duplicate consecutive plays of the same track
    const filtered = history.filter((h) => h.song.id !== song.id);
    const updated = [item, ...filtered].slice(0, 100);

    set({ history: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  clearHistory: () => {
    set({ history: [] });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  },
}));
