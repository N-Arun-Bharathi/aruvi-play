import { create } from "zustand";
import { Song } from "../types/song";
import { loadRecent } from "../services/storage";
import { supabase } from "../services/supabase";
import {
  dbGetLikedSongs,
  dbSaveLikedSong,
  dbRemoveLikedSong,
  dbSaveUser,
} from "../services/sqlite";
import { useToastStore } from "./toastStore";

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

  if (t1 !== t2 && !t1.includes(t2) && !t2.includes(t1)) return false;

  const getArtists = (a: string) =>
    a
      .toLowerCase()
      .split(/[;,]/)
      .map((x) => normalize(x))
      .filter((x) => x.length > 2);

  const a1 = getArtists(s1.artist);
  const a2 = getArtists(s2.artist);

  return a1.some((name1) => a2.some((name2) => name1 === name2 || name1.includes(name2) || name2.includes(name1)));
};

interface ParsedSong {
  id: string;
  normalizedTitle: string;
  artists: string[];
}

const songParseCache = new Map<string, ParsedSong>();

const parseSong = (song: Song): ParsedSong => {
  const getArtists = (a: string) =>
    a
      .toLowerCase()
      .split(/[;,]/)
      .map((x) => normalize(x))
      .filter((x) => x.length > 2);

  return {
    id: song.id,
    normalizedTitle: normalize(song.title),
    artists: getArtists(song.artist),
  };
};

const getParsedSong = (song: Song): ParsedSong => {
  const key = `${song.id}|${song.title}|${song.artist}`;
  let cached = songParseCache.get(key);
  if (!cached) {
    cached = parseSong(song);
    songParseCache.set(key, cached);
  }
  return cached;
};

interface LikedState {
  liked: Song[];
  recent: Song[];
  hydrated: boolean;
  resolvedCache: Record<string, Song>;
  parsedLiked: ParsedSong[];
  likedIds: Set<string>;
  titleToArtistsMap: Map<string, string[][]>;
  hydrate: () => Promise<void>;
  toggleLike: (song: Song) => Promise<void>;
  isLiked: (song: Song) => boolean;
  refreshRecent: () => Promise<void>;
  resolveAndPlay: (item: any, contextList: any[]) => Promise<void>;
}

export const useLibraryStore = create<LikedState>((set, get) => ({
  liked: [],
  recent: [],
  hydrated: false,
  resolvedCache: {},
  parsedLiked: [],
  likedIds: new Set(),
  titleToArtistsMap: new Map(),

  hydrate: async () => {
    let user = null;
    try {
      const { useAuthStore } = require("./authStore");
      user = useAuthStore.getState().userProfile;
    } catch (e) {
      console.warn("likedStore hydrate: Could not require authStore dynamically", e);
    }

    const userId = user?.id || "guest-user";
    const isOwner = user?.is_owner || false;

    // 1. Load from local SQLite cache first
    let liked = await dbGetLikedSongs(userId);
    const recent = await loadRecent();

    // Populate with likedSongs.json ONLY for Admin/Owner and if local cache is empty
    if (isOwner && liked.length === 0) {
      console.log("likedStore: Admin user detected. Importing predefined liked list JSON...");
      try {
        // Ensure profile row exists to prevent SQLite FK constraint violations
        await dbSaveUser({
          id: userId,
          name: "Aruvi Admin",
          is_owner: true,
          initial_likes_imported: true,
        });

        const likedJson = require("../assets/likedSongs.json");
        const formatted: Song[] = likedJson.map((s: any, i: number) => ({
          id: s.id || `json:${s.title}-${s.artist}-${i}`,
          title: s.title,
          artist: s.artist,
          album: s.album || "",
          artwork: s.artwork || "",
          url: s.url || "",
          duration: s.duration || 0,
          source: s.source || "online",
        }));
        
        for (const s of formatted) {
          await dbSaveLikedSong(userId, s);
        }
        liked = formatted;
      } catch (err) {
        console.error("Failed to load likedSongs.json for Admin profile:", err);
      }
    }

    const rebuildMaps = (list: Song[]) => {
      const parsedLiked = list.map(getParsedSong);
      const likedIds = new Set(list.map((s) => s.id));
      const titleToArtistsMap = new Map<string, string[][]>();
      for (const s of list) {
        const target = getParsedSong(s);
        const titleKey = target.normalizedTitle;
        if (!titleToArtistsMap.has(titleKey)) {
          titleToArtistsMap.set(titleKey, []);
        }
        titleToArtistsMap.get(titleKey)!.push(target.artists);
      }
      set({ liked: list, parsedLiked, likedIds, titleToArtistsMap, recent, hydrated: true });
    };

    rebuildMaps(liked);

    // 2. Fetch fresh liked songs list from Supabase if online session exists
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: serverLikes, error } = await supabase
          .from("liked_songs")
          .select("song_id, songs(*)")
          .eq("user_id", userId);

        if (serverLikes && !error) {
          const serverSongs: Song[] = serverLikes
            .map((item: any) => {
              const s = item.songs;
              if (!s) return null;
              return {
                id: s.id,
                title: s.title,
                artist: s.artist,
                album: s.album || "",
                artwork: s.artwork_url || "",
                url: s.source_url || "",
                duration: s.duration_seconds || 0,
                source: s.source_type === "local" ? "local" : "online",
              } as Song;
            })
            .filter(Boolean) as Song[];

          // Sync SQLite cache with Supabase records
          const currentLocal = await dbGetLikedSongs(userId);
          for (const lSong of currentLocal) {
            if (!serverSongs.some((s) => s.id === lSong.id)) {
              await dbRemoveLikedSong(userId, lSong.id);
            }
          }
          for (const sSong of serverSongs) {
            await dbSaveLikedSong(userId, sSong);
          }

          liked = serverSongs;
          rebuildMaps(liked);
        }
      }
    } catch (e) {
      // Fail silently for offline/local modes
    }
  },

  toggleLike: async (song) => {
    let user = null;
    try {
      const { useAuthStore } = require("./authStore");
      user = useAuthStore.getState().userProfile;
    } catch (e) {}

    const userId = user?.id || "guest-user";
    const toast = useToastStore.getState();

    const { liked } = get();
    const exists = liked.some((s) => songsMatch(s, song));

    // Optimistic UI updates
    const nextLiked = exists
      ? liked.filter((s) => !songsMatch(s, song))
      : [song, ...liked];

    // Rebuild local cache states
    const parsedLiked = nextLiked.map(getParsedSong);
    const likedIds = new Set(nextLiked.map((s) => s.id));
    const titleToArtistsMap = new Map<string, string[][]>();
    for (const s of nextLiked) {
      const target = getParsedSong(s);
      const titleKey = target.normalizedTitle;
      if (!titleToArtistsMap.has(titleKey)) {
        titleToArtistsMap.set(titleKey, []);
      }
      titleToArtistsMap.get(titleKey)!.push(target.artists);
    }

    set({ liked: nextLiked, parsedLiked, likedIds, titleToArtistsMap });
    toast.show(exists ? "Removed from Liked Songs" : "Added to Liked Songs");

    // Perform background db sync
    try {
      if (exists) {
        // 1. Remove from SQLite
        await dbRemoveLikedSong(userId, song.id);

        // 2. Remove from Supabase if online
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from("liked_songs")
            .delete()
            .eq("user_id", userId)
            .eq("song_id", song.id);
        }
      } else {
        // 1. Add to SQLite
        await dbSaveLikedSong(userId, song);

        // 2. Add to Supabase if online
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from("songs")
            .upsert({
              id: song.id,
              title: song.title,
              normalized_title: song.normalized_title || song.title.toLowerCase().trim(),
              artist: song.artist,
              album: song.album || null,
              artwork_url: song.artwork || null,
              duration_seconds: song.duration || null,
              source_type: song.source || "online",
              source_url: song.url || null
            });

          await supabase
            .from("liked_songs")
            .insert({
              user_id: userId,
              song_id: song.id
            });
        }
      }
    } catch (dbErr) {
      console.warn("Database like sync skipped/failed:", dbErr);
    }
  },

  isLiked: (song) => {
    if (!song || !song.id) return false;
    const { likedIds, titleToArtistsMap } = get();
    if (!likedIds || likedIds.size === 0) return false;
    if (likedIds.has(song.id)) return true;

    const target = getParsedSong(song);
    const titleKey = target.normalizedTitle;
    
    const artistLists = titleToArtistsMap.get(titleKey);
    if (artistLists) {
      const match = artistLists.some((artists) => 
        artists.some((name1) =>
          target.artists.some((name2) =>
            name1 === name2 || name1.includes(name2) || name2.includes(name1)
          )
        )
      );
      if (match) return true;
    }

    for (const [title, artistsList] of titleToArtistsMap.entries()) {
      if (title !== titleKey && (title.includes(titleKey) || titleKey.includes(title))) {
        const match = artistsList.some((artists) => 
          artists.some((name1) =>
            target.artists.some((name2) =>
              name1 === name2 || name1.includes(name2) || name2.includes(name1)
            )
          )
        );
        if (match) return true;
      }
    }

    return false;
  },

  refreshRecent: async () => {
    const recent = await loadRecent();
    set({ recent });
  },

  resolveAndPlay: async (item, contextList) => {
    const { usePlayerStore } = require("./playerStore");
    const player = usePlayerStore.getState();

    const skeletonQueue: Song[] = contextList.map((s, i) => ({
      id: s.id || `json:${s.title}-${s.artist}-${i}`,
      title: s.title,
      artist: s.artist,
      album: s.album,
      artwork: "",
      url: "",
      duration: 0,
      source: "online",
    }));

    const targetId = item.id || `json:${item.title}-${item.artist}-${contextList.indexOf(item)}`;
    const songToPlay = skeletonQueue.find((s) => s.id === targetId) || skeletonQueue[0];

    await player.playSong(songToPlay, skeletonQueue);
  },
}));
