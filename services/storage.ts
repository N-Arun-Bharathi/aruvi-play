import AsyncStorage from "@react-native-async-storage/async-storage";
import { Song } from "../types/song";

const KEYS = {
  liked: "aruvi:liked",
  recent: "aruvi:recent",
  lastPlayed: "aruvi:lastPlayed",
} as const;

export async function loadLiked(): Promise<Song[]> {
  const raw = await AsyncStorage.getItem(KEYS.liked);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLiked(songs: Song[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.liked, JSON.stringify(songs));
}

export async function loadRecent(): Promise<Song[]> {
  const raw = await AsyncStorage.getItem(KEYS.recent);
  return raw ? JSON.parse(raw) : [];
}

export async function saveRecent(songs: Song[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.recent, JSON.stringify(songs.slice(0, 30)));
}

export async function pushRecent(song: Song): Promise<Song[]> {
  const list = await loadRecent();
  const filtered = list.filter((s) => s.id !== song.id);
  filtered.unshift(song);
  const trimmed = filtered.slice(0, 30);
  await saveRecent(trimmed);
  return trimmed;
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
