import axios from "axios";
import { Song, SaavnSong } from "../types/song";

const BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const client = axios.create({
  baseURL: BASE,
  timeout: 15000,
});

function pickImage(image: SaavnSong["image"]): string | undefined {
  if (typeof image === "string") return image;
  if (!Array.isArray(image)) return undefined;
  const high = image.find((i) => i.quality === "500x500");
  return (high ?? image[image.length - 1])?.link;
}

function pickUrl(downloadUrl: SaavnSong["downloadUrl"]): string | undefined {
  if (!downloadUrl?.length) return undefined;
  const high = downloadUrl.find((d) => d.quality === "320kbps");
  return (high ?? downloadUrl[downloadUrl.length - 1])?.link;
}

function artistName(s: SaavnSong): string {
  if (s.primaryArtists) return s.primaryArtists;
  const primary = s.artists?.primary;
  if (primary?.length) return primary.map((a) => a.name).join(", ");
  return "Unknown";
}

function albumName(s: SaavnSong): string {
  if (typeof s.album === "string") return s.album;
  return s.album?.name ?? "";
}

export function mapSaavnToSong(s: SaavnSong): Song | null {
  const url = pickUrl(s.downloadUrl);
  if (!url) return null;
  return {
    id: s.id,
    title: decodeHtml(s.name),
    artist: decodeHtml(artistName(s)),
    album: decodeHtml(albumName(s)),
    artwork: pickImage(s.image),
    url,
    duration: typeof s.duration === "string" ? parseInt(s.duration, 10) : s.duration,
    source: "online",
    primaryArtists: s.primaryArtists,
  };
}

function decodeHtml(s: string): string {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function deduplicateSongs(songs: Song[]): Song[] {
  const uniqueMap = new Map();
  for (const s of songs) {
    const key = `${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, s);
    }
  }
  return Array.from(uniqueMap.values());
}

export async function searchSongs(query: string, limit = 20): Promise<Song[]> {
  if (!query.trim()) return [];
  const res = await client.get(`/search/songs`, {
    params: { query, limit },
  });
  const results: SaavnSong[] = res.data?.data?.results ?? [];
  const mapped = results.map(mapSaavnToSong).filter(Boolean) as Song[];
  return deduplicateSongs(mapped);
}

export async function getSongById(id: string): Promise<Song | null> {
  const res = await client.get(`/songs`, { params: { id: id } });
  const results: SaavnSong[] = res.data?.data ?? [];
  if (!results.length) return null;
  return mapSaavnToSong(results[0]);
}

export async function getRelatedSongs(id: string): Promise<Song[]> {
  try {
    const res = await client.get(`/songs/${id}/suggestions`, {
      params: { limit: 20 },
    });
    const results: SaavnSong[] = res.data?.data ?? [];
    const mapped = results.map(mapSaavnToSong).filter(Boolean) as Song[];
    return deduplicateSongs(mapped);
  } catch {
    return [];
  }
}

export async function getTrending(language = "tamil,english,hindi"): Promise<Song[]> {
  try {
    // Search specifically for top hits in the selected languages
    const langQuery = language.split(",").map(l => `${l.trim()} top hits`).join(" ");
    const res = await client.get(`/search/songs`, {
      params: { query: langQuery || "trending songs", limit: 30 },
    });
    const results: SaavnSong[] = res.data?.data?.results ?? [];
    const mapped = results.map(mapSaavnToSong).filter(Boolean) as Song[];
    return deduplicateSongs(mapped);
  } catch {
    return [];
  }
}
export async function resolveSong(title: string, artist: string): Promise<Song | null> {
  const firstArtist = artist.split(";")[0].trim();
  const query = `${title} ${firstArtist}`;
  try {
    let results = await searchSongs(query, 5);
    if (results.length === 0) {
      results = await searchSongs(title, 5);
    }
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Resolve error:", error);
    return null;
  }
}
