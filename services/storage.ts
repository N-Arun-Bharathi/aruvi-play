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
