import { create } from "zustand";
import { Song } from "../types/song";
import { loadLiked, saveLiked, loadRecent } from "../services/storage";

interface LikedState {
  liked: Song[];
  likedJson: any[];
  recent: Song[];
  hydrated: boolean;
  resolvedCache: Record<string, Song>;
  hydrate: () => Promise<void>;
  toggleLike: (song: Song) => Promise<void>;
  isLiked: (id: string) => boolean;
  refreshRecent: () => Promise<void>;
  resolveAndPlay: (item: any, contextList: any[]) => Promise<void>;
}

export const useLibraryStore = create<LikedState>((set, get) => ({
  liked: [],
  likedJson: [],
  recent: [],
  hydrated: false,
  resolvedCache: {},

  hydrate: async () => {
    const [liked, recent] = await Promise.all([loadLiked(), loadRecent()]);
    let likedJson = [];
    try {
      likedJson = require("../assets/likedSongs.json");
    } catch (e) {
      console.error("Failed to load likedSongs.json", e);
    }
    set({ liked, recent, likedJson, hydrated: true });
  },

  toggleLike: async (song) => {
    const { liked } = get();
    const exists = liked.some((s) => s.id === song.id);
    const next = exists
      ? liked.filter((s) => s.id !== song.id)
      : [song, ...liked];
    await saveLiked(next);
    set({ liked: next });
  },

  isLiked: (id) => get().liked.some((s) => s.id === id),

  refreshRecent: async () => {
    const recent = await loadRecent();
    set({ recent });
  },

  resolveAndPlay: async (item, contextList) => {
    const { usePlayerStore } = require("./playerStore");
    const player = usePlayerStore.getState();

    // Map contextList to skeleton Song objects
    const skeletonQueue: Song[] = contextList.map((s, i) => ({
      id: `json:${s.title}-${s.artist}-${i}`,
      title: s.title,
      artist: s.artist,
      album: s.album,
      artwork: "",
      url: "", // No URL yet, player will resolve it
      duration: 0,
      source: "online",
    }));

    const targetId = `json:${item.title}-${item.artist}-${contextList.indexOf(item)}`;
    const songToPlay = skeletonQueue.find((s) => s.id === targetId) || skeletonQueue[0];

    await player.playSong(songToPlay, skeletonQueue);
  },
}));
