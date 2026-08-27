import { create } from "zustand";
import { Song } from "@aruvi/shared";

interface LikedStoreState {
  likedSongs: Song[];
  hydrate: () => void;
  toggleLike: (song: Song) => void;
  isLiked: (songId: string) => boolean;
}

const STORAGE_KEY = "aruvi_web_liked_songs";

function loadInitialLiked(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export const useLikedStore = create<LikedStoreState>((set, get) => ({
  likedSongs: loadInitialLiked(),

  hydrate: () => {
    set({ likedSongs: loadInitialLiked() });
  },

  toggleLike: (song: Song) => {
    const current = get().likedSongs;
    const exists = current.some((s) => s.id === song.id);
    const updated = exists
      ? current.filter((s) => s.id !== song.id)
      : [song, ...current];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save liked songs:", e);
    }

    set({ likedSongs: updated });
  },

  isLiked: (songId: string) => {
    return get().likedSongs.some((s) => s.id === songId);
  },
}));
