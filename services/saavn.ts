import axios, { AxiosInstance } from "axios";
import { Song, SaavnSong } from "../types/song";
import { detectSongContext } from "../utils/contextDetector";
import { getSearchPriority, normalizeSongTitle } from "../utils/songUtils";

export let apiCallCount = 0;
export const getApiCallCount = () => apiCallCount;

const searchCache = new Map<string, Song[]>();
const relatedSongsCache = new Map<string, Song[]>();
const songByIdCache = new Map<string, Song>();

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

async function request(url: string, params: any = {}, signal?: AbortSignal): Promise<any> {
  apiCallCount++;
  const maxRetries = BASE_URLS.length;
  let lastError: any = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // The NepoTuneAPI (and others) might need /api prefix or not.
      // We'll try to detect and normalize.
      const isBeta = BASE_URLS[currentBaseIndex].includes("beta");
      const path = isBeta ? url : `/api${url}`;
      
      const res = await client.get(path, { params, signal });
      return res.data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw error;
      }
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

  // Extract artists and musicDirector
  let musicDirector = "";
  let primaryArtist = "";
  const artistsList: string[] = [];

  if (s.artists) {
    if (Array.isArray(s.artists.all)) {
      s.artists.all.forEach((a: any) => {
        if (a.name) {
          const name = decodeHtml(a.name).trim();
          if (name && !artistsList.includes(name)) {
            artistsList.push(name);
          }
          if (a.role === "music" && !musicDirector) {
            musicDirector = name;
          }
        }
      });
    }

    if (Array.isArray(s.artists.primary)) {
      s.artists.primary.forEach((a: any) => {
        if (a.name) {
          const name = decodeHtml(a.name).trim();
          if (name && !artistsList.includes(name)) {
            artistsList.push(name);
          }
          if (a.role === "music" && !musicDirector) {
            musicDirector = name;
          }
          if (!primaryArtist) {
            primaryArtist = name;
          }
        }
      });
    }
  }

  // Fallbacks for primaryArtist:
  const primaryArtistsStr = s.primaryArtists ? decodeHtml(s.primaryArtists) : "";
  if (!primaryArtist && primaryArtistsStr) {
    primaryArtist = primaryArtistsStr.split(/[;,]/)[0].trim();
  }

  const mappedArtist = decodeHtml(artistName(s));
  if (!primaryArtist && mappedArtist) {
    primaryArtist = mappedArtist.split(/[;,]/)[0].trim();
  }

  if (artistsList.length === 0 && mappedArtist) {
    mappedArtist.split(/[;,]/).forEach((a) => {
      const name = a.trim();
      if (name && !artistsList.includes(name)) {
        artistsList.push(name);
      }
    });
  }

  // Use context detector to extract language, energy, genre, mood
  const tempSongForContext = {
    title: decodeHtml(s.name),
    artist: mappedArtist,
  } as Song;
  const context = detectSongContext(tempSongForContext);

  const lang = s.language ? s.language.toLowerCase() : context.language;

  return {
    id: s.id,
    title: decodeHtml(s.name),
    artist: mappedArtist,
    album: decodeHtml(albumName(s)),
    artwork: pickImage(s.image),
    url,
    duration: typeof s.duration === "string" ? parseInt(s.duration, 10) : s.duration,
    source: "online",
    primaryArtists: primaryArtistsStr || undefined,

    primaryArtist,
    normalized_title: normalizeSongTitle(decodeHtml(s.name)),
    artists: artistsList,
    musicDirector: musicDirector || undefined,
    language: lang,
    genre: context.type,
    mood: context.mood,
    energy: context.energy,
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

export async function searchSongs(query: string, limit = 20, signal?: AbortSignal): Promise<Song[]> {
  if (!query.trim()) return [];
  const cacheKey = `${query.trim().toLowerCase()}:${limit}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  try {
    const data = await request(`/search/songs`, { query, limit }, signal);
    const results: SaavnSong[] = data?.data?.results ?? [];
    const mapped = results.map(mapSaavnToSong).filter(Boolean) as Song[];
    
    // Sort search results based on search priority
    const sorted = mapped.sort((a, b) => getSearchPriority(b.title) - getSearchPriority(a.title));
    
    searchCache.set(cacheKey, sorted);
    return sorted;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }
    console.error("Search error:", error);
    return [];
  }
}

export async function getSongById(id: string): Promise<Song | null> {
  if (songByIdCache.has(id)) {
    return songByIdCache.get(id)!;
  }

  try {
    // Some use /songs?id=, some use /songs/:id. request() handles normalization to query params mostly.
    const data = await request(`/songs`, { id });
    const results: SaavnSong[] = data?.data ?? [];
    if (!results.length) return null;
    const song = mapSaavnToSong(results[0]);
    if (song) {
      songByIdCache.set(id, song);
    }
    return song;
  } catch (error) {
    console.error("Get song error:", error);
    return null;
  }
}

export async function getRelatedSongs(id: string): Promise<Song[]> {
  if (relatedSongsCache.has(id)) {
    return relatedSongsCache.get(id)!;
  }

  try {
    const data = await request(`/songs/${id}/suggestions`, { limit: 20 });
    const results: SaavnSong[] = data?.data ?? [];
    const mapped = results.map(mapSaavnToSong).filter(Boolean) as Song[];
    relatedSongsCache.set(id, mapped);
    return mapped;
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
