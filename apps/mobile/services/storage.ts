import AsyncStorage from "@react-native-async-storage/async-storage";
import { Song } from "../types/song";
import { useAuthStore } from "../store/authStore";
import {
  dbGetLikedSongs,
  dbSaveLikedSong,
  dbRemoveLikedSong,
  dbGetHistory,
  dbSaveHistory,
  dbSaveUser,
} from "./sqlite";

// Fetch the active authenticated user ID
function getActiveUserId(): string {
  const user = useAuthStore.getState().userProfile;
  return user?.id || "guest-user";
}

const KEYS = {
  lastPlayed: "aruvi:lastPlayed",
  activeQueue: "aruvi:activeQueue",
} as const;

export async function loadLiked(): Promise<Song[]> {
  try {
    const userId = getActiveUserId();
    return await dbGetLikedSongs(userId);
  } catch (e) {
    console.error("Failed to load liked songs from SQLite", e);
    return [];
  }
}

export async function saveLiked(songs: Song[]): Promise<void> {
  try {
    const userId = getActiveUserId();
    const current = await dbGetLikedSongs(userId);
    for (const song of current) {
      await dbRemoveLikedSong(userId, song.id);
    }
    for (const song of songs) {
      await dbSaveLikedSong(userId, song);
    }
  } catch (e) {
    console.error("Failed to save liked songs to SQLite", e);
  }
}

export async function loadRecent(): Promise<Song[]> {
  try {
    const userId = getActiveUserId();
    return await dbGetHistory(userId, 30);
  } catch (e) {
    console.error("Failed to load history from SQLite", e);
    return [];
  }
}

export async function saveRecent(songs: Song[]): Promise<void> {
  // Handled dynamically via pushRecent/dbSaveHistory
}

export async function pushRecent(song: Song): Promise<Song[]> {
  try {
    const { useAuthStore } = require("../store/authStore");
    const userProfile = useAuthStore.getState().userProfile;
    if (userProfile?.is_guest) {
      return [];
    }
    const userId = getActiveUserId();
    await dbSaveHistory(userId, song, 100.0, "online");
    return await dbGetHistory(userId, 30);
  } catch (e) {
    console.error("Failed to push history to SQLite", e);
    return [];
  }
}

export async function loadLastPlayed(): Promise<{
  song: Song;
  position: number;
} | null> {
  const raw = await AsyncStorage.getItem(KEYS.lastPlayed);
  return raw ? JSON.parse(raw) : null;
}

export async function saveLastPlayed(song: Song, position: number) {
  await AsyncStorage.setItem(
    KEYS.lastPlayed,
    JSON.stringify({ song, position })
  );
}

export async function loadActiveQueue(): Promise<{
  songs: Song[];
  index: number;
} | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.activeQueue);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.songs)) {
      parsed.songs = parsed.songs.map((s: Song) =>
        s.source === "local" ? s : { ...s, url: "" }
      );
    }
    return parsed;
  } catch (e) {
    console.error("Failed to load active queue from AsyncStorage", e);
    return null;
  }
}

export async function saveActiveQueue(songs: Song[], index: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEYS.activeQueue,
      JSON.stringify({ songs, index })
    );
  } catch (e) {
    console.error("Failed to save active queue to AsyncStorage", e);
  }
}
