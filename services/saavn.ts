import axios, { AxiosInstance } from "axios";
import { Song, SaavnSong } from "../types/song";

const BASE_URLS = [
  "https://nepotuneapi.vercel.app",
  "https://jiosaavn-api-beta.vercel.app",
  "https://saavn-api.vercel.app",
];

let currentBaseIndex = 0;

function createClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 20000,
  });
}

let client = createClient(BASE_URLS[currentBaseIndex]);

/**
 * Rotates the API base URL if a network error occurs.
 */
function rotateBase() {
  currentBaseIndex = (currentBaseIndex + 1) % BASE_URLS.length;
  client = createClient(BASE_URLS[currentBaseIndex]);
  console.log(`Switched API base to: ${BASE_URLS[currentBaseIndex]}`);
}

async function request(url: string, params: any = {}): Promise<any> {
  const maxRetries = BASE_URLS.length;
  let lastError: any = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // The NepoTuneAPI (and others) might need /api prefix or not.
      // We'll try to detect and normalize.
      const isBeta = BASE_URLS[currentBaseIndex].includes("beta");
      const path = isBeta ? url : `/api${url}`;
      
      const res = await client.get(path, { params });
      return res.data;
    } catch (error: any) {
      lastError = error;
      // Only rotate on network errors or 404/500s. 
      if (!error.response || error.response.status >= 500 || error.response.status === 404) {
        rotateBase();
        // Wait a bit before retry
        await new Promise(r => setTimeout(r, 1000));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

function pickImage(image: SaavnSong["image"]): string | undefined {
  if (typeof image === "string") return image;
  if (!Array.isArray(image)) return undefined;
  const high = image.find((i) => i.quality === "500x500");
  const fallback = image[image.length - 1];
  // Newer APIs use .url, older ones use .link
  return (high ?? fallback)?.url ?? (high ?? fallback)?.link;
}

function pickUrl(downloadUrl: SaavnSong["downloadUrl"]): string | undefined {
  if (!downloadUrl?.length) return undefined;
  const high = downloadUrl.find((d) => d.quality === "320kbps");
  const fallback = downloadUrl[downloadUrl.length - 1];
  return (high ?? fallback)?.url ?? (high ?? fallback)?.link;
}

function artistName(s: SaavnSong): string {
  if (s.primaryArtists && typeof s.primaryArtists === "string") return s.primaryArtists;
  const primary = s.artists?.primary;
  if (primary?.length) return primary.map((a: any) => a.name).join(", ");
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
    primaryArtists: typeof s.primaryArtists === "string" ? s.primaryArtists : undefined,
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

export async function searchSongs(query: string, limit = 20): Promise<Song[]> {
  if (!query.trim()) return [];
  try {
    const data = await request(`/search/songs`, { query, limit });
    const results: SaavnSong[] = data?.data?.results ?? [];
    return results.map(mapSaavnToSong).filter(Boolean) as Song[];
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

export async function getSongById(id: string): Promise<Song | null> {
  try {
    // Some use /songs?id=, some use /songs/:id. request() handles normalization to query params mostly.
    const data = await request(`/songs`, { id });
    const results: SaavnSong[] = data?.data ?? [];
    if (!results.length) return null;
    return mapSaavnToSong(results[0]);
  } catch (error) {
    console.error("Get song error:", error);
    return null;
  }
}

export async function getRelatedSongs(id: string): Promise<Song[]> {
  try {
    const data = await request(`/songs/${id}/suggestions`, { limit: 20 });
    const results: SaavnSong[] = data?.data ?? [];
    return results.map(mapSaavnToSong).filter(Boolean) as Song[];
  } catch {
    return [];
  }
}

export async function getTrending(language = "tamil,english,hindi"): Promise<Song[]> {
  try {
    const langQuery = language.split(",").map(l => `${l.trim()} top hits`).join(" ");
    const data = await request(`/search/songs`, { query: langQuery || "trending songs", limit: 30 });
    const results: SaavnSong[] = data?.data?.results ?? [];
    return results.map(mapSaavnToSong).filter(Boolean) as Song[];
  } catch {
    return [];
  }
}

export async function resolveSong(title: string, artist: string): Promise<Song | null> {
  const firstArtist = artist.split(";")[0].trim();
  const cleanTitle = title.replace(/[^a-zA-Z0-9\u0B80-\u0BFF\s]/g, "").trim();
  const firstWord = title.split(/\s+/)[0];

  const queries = [
    `${title} ${firstArtist}`,
    title,
    `${cleanTitle} ${firstArtist}`,
    cleanTitle,
    `${firstWord} ${firstArtist}`,
    firstArtist,
  ].filter((q, i, arr) => q.trim().length > 0 && arr.indexOf(q) === i);

  for (const query of queries) {
    const results = await searchSongs(query, 5);
    if (results.length > 0) return results[0];
  }
  return null;
}
