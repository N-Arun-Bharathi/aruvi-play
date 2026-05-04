import { create } from "zustand";
import { Song } from "../types/song";
import { loadLiked, saveLiked, loadRecent } from "../services/storage";

const normalize = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const songsMatch = (s1: Song, s2: Song) => {
  if (!s1 || !s2) return false;
  if (s1.id === s2.id) return true;

  const t1 = normalize(s1.title);
  const t2 = normalize(s2.title);

  // If titles don't match, they aren't the same song
  if (t1 !== t2 && !t1.includes(t2) && !t2.includes(t1)) return false;

  // Split artists and check for any common artist
  const getArtists = (a: string) =>
    a
      .toLowerCase()
      .split(/[;,]/)
      .map((x) => normalize(x))
      .filter((x) => x.length > 2); // Avoid matching very short names

  const a1 = getArtists(s1.artist);
  const a2 = getArtists(s2.artist);

  return a1.some((name1) => a2.some((name2) => name1 === name2 || name1.includes(name2) || name2.includes(name1)));
};

interface LikedState {
  liked: Song[];
  likedJson: any[];
  recent: Song[];
  hydrated: boolean;
  resolvedCache: Record<string, Song>;
  hydrate: () => Promise<void>;
  toggleLike: (song: Song) => Promise<void>;
  isLiked: (song: Song) => boolean;
  refreshRecent: () => Promise<void>;
  resolveAndPlay: (item: any, contextList: any[]) => Promise<void>;
}

import { useToastStore } from "./toastStore";

export const useLibraryStore = create<LikedState>((set, get) => ({
  liked: [],
  likedJson: [],
  recent: [],
  hydrated: false,
  resolvedCache: {},

  hydrate: async () => {
    let liked = await loadLiked();
    let likedJson = [];
    
    try {
      likedJson = require("../assets/likedSongs.json");
    } catch (e) {
      console.error("Failed to load likedSongs.json", e);
    }

    // Fallback to liked list if AsyncStorage is empty
    if (liked.length === 0 && likedJson.length > 0) {
      liked = likedJson.map((s: any, i: number) => ({
        id: s.id || `json:${s.title}-${s.artist}-${i}`,
        title: s.title,
        artist: s.artist,
        album: s.album || "",
        artwork: s.artwork || "",
        url: s.url || "",
        duration: s.duration || 0,
        source: s.source || "online",
      }));
      await saveLiked(liked);
    }

    const recent = await loadRecent();
    set({ liked, likedJson, recent, hydrated: true });
  },

  toggleLike: async (song) => {
    const { liked } = get();
    const exists = liked.some((s) => songsMatch(s, song));
    const next = exists
      ? liked.filter((s) => !songsMatch(s, song))
      : [song, ...liked];
    
    await saveLiked(next);
    set({ liked: next });

    const toast = useToastStore.getState();
    if (exists) {
      toast.show("Removed from Liked Songs");
    } else {
      toast.show("Added to Liked Songs");
    }
  },

  isLiked: (song) => {
    const { liked } = get();
    return liked.some((s) => songsMatch(s, song));
  },

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
