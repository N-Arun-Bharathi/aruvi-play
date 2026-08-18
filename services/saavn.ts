import axios, { AxiosInstance } from "axios";
import CryptoJS from "crypto-js";
import { Song, SaavnSong } from "../types/song";
import { detectSongContext } from "../utils/contextDetector";
import { getSearchPriority, normalizeSongTitle } from "../utils/songUtils";

export let apiCallCount = 0;
export const getApiCallCount = () => apiCallCount;

const searchCache = new Map<string, Song[]>();
const relatedSongsCache = new Map<string, Song[]>();
const songByIdCache = new Map<string, Song>();

const BASE_URLS = [
  "https://www.jiosaavn.com",
  "https://jiosaavn-api-beta.vercel.app",
];

let currentBaseIndex = 0;

function createClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 20000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
    },
  });
}

let client = createClient(BASE_URLS[currentBaseIndex]);

function rotateBase() {
  currentBaseIndex = (currentBaseIndex + 1) % BASE_URLS.length;
  client = createClient(BASE_URLS[currentBaseIndex]);
  console.log(`Switched API base to: ${BASE_URLS[currentBaseIndex]}`);
}

/**
 * Decrypts JioSaavn DES-ECB encrypted media URL to direct 320kbps audio CDN stream URL.
 */
export function decryptMediaUrl(encryptedUrl?: string): string | undefined {
  if (!encryptedUrl || typeof encryptedUrl !== "string") return undefined;
  try {
    const key = CryptoJS.enc.Utf8.parse("38346591");
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr || !decryptedStr.includes("http")) return undefined;

    return decryptedStr
      .replace("_96.mp4", "_320.mp4")
      .replace("_96.mp3", "_320.mp3")
      .replace("_160.mp4", "_320.mp4")
      .replace("_160.mp3", "_320.mp3")
      .replace(/^http:/, "https:");
  } catch (error) {
    console.error("Error decrypting media URL:", error);
    return undefined;
  }
}

async function request(url: string, params: any = {}, signal?: AbortSignal): Promise<any> {
  apiCallCount++;
  const maxRetries = BASE_URLS.length * 2;
  let lastError: any = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const isOfficial = BASE_URLS[currentBaseIndex].includes("jiosaavn.com");
      const isBeta = BASE_URLS[currentBaseIndex].includes("beta");

      let reqUrl = url;
      if (isOfficial && !url.startsWith("/api.php")) {
        reqUrl = "/api.php";
      } else if (!isOfficial && !isBeta && !url.startsWith("/api")) {
        reqUrl = `/api${url}`;
      }

      const res = await client.get(reqUrl, { params, signal });

      // Handle cases where response returns non-200 or Vercel error payload
      if (
        typeof res.data === "string" &&
        (res.data.includes("Payment required") || res.data.includes("DEPLOYMENT_DISABLED"))
      ) {
        throw new Error("API base disabled or payment required");
      }

      return res.data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        throw error;
      }
      lastError = error;
      rotateBase();
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError;
}

function pickImage(image: SaavnSong["image"] | any): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") {
    return image
      .replace("50x50", "500x500")
      .replace("150x150", "500x500")
      .replace(/^http:/, "https:");
  }
  if (Array.isArray(image)) {
    const high = image.find((i) => i.quality === "500x500");
    const fallback = image[image.length - 1];
    const url = (high ?? fallback)?.url ?? (high ?? fallback)?.link;
    if (url) return url.replace(/^http:/, "https:");
  }
  return undefined;
}

function pickUrl(s: SaavnSong | any): string | undefined {
  // First try DES decryption of encrypted_media_url / media_preview_url
  if (s.encrypted_media_url) {
    const decrypted = decryptMediaUrl(s.encrypted_media_url);
    if (decrypted) return decrypted;
  }
  if (s.media_preview_url) {
    const decrypted = decryptMediaUrl(s.media_preview_url);
    if (decrypted) return decrypted;
  }

  // Fallback to downloadUrl if present and valid
  const downloadUrl = s.downloadUrl;
  if (Array.isArray(downloadUrl) && downloadUrl.length > 0) {
    const high = downloadUrl.find((d: any) => d.quality === "320kbps");
    const fallback = downloadUrl[downloadUrl.length - 1];
    const url = (high ?? fallback)?.url ?? (high ?? fallback)?.link;
    if (url) return url.replace(/^http:/, "https:");
  }

  return undefined;
}

function artistName(s: SaavnSong | any): string {
  if (s.primary_artists && typeof s.primary_artists === "string") return s.primary_artists;
  if (s.singers && typeof s.singers === "string") return s.singers;
  if (s.primaryArtists && typeof s.primaryArtists === "string") return s.primaryArtists;

  const primary = s.artists?.primary;
  if (primary?.length) return primary.map((a: any) => a.name).join(", ");
  return "Unknown";
}

function albumName(s: SaavnSong | any): string {
  if (typeof s.album === "string") return s.album;
  return s.album?.name ?? "";
}

function songName(s: SaavnSong | any): string {
  return s.song || s.name || s.title || "Unknown";
}

export function mapSaavnToSong(s: SaavnSong | any): Song | null {
  if (!s) return null;
  const url = pickUrl(s);
  if (!url) return null;

  const rawTitle = songName(s);
  const title = decodeHtml(rawTitle);
  const mappedArtist = decodeHtml(artistName(s));

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

  const primaryArtistsStr = s.primary_artists || s.primaryArtists ? decodeHtml(s.primary_artists || s.primaryArtists) : "";
  if (!primaryArtist && primaryArtistsStr) {
    primaryArtist = primaryArtistsStr.split(/[;,]/)[0].trim();
  }

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

  const tempSongForContext = {
    title,
    artist: mappedArtist,
  } as Song;
  const context = detectSongContext(tempSongForContext);

  const lang = s.language ? s.language.toLowerCase() : context.language;

  return {
    id: String(s.id),
    title,
    artist: mappedArtist,
    album: decodeHtml(albumName(s)),
    artwork: pickImage(s.image || s.artwork_url),
    url,
    duration: typeof s.duration === "string" ? parseInt(s.duration, 10) : (s.duration || 0),
    source: "online",
    primaryArtists: primaryArtistsStr || undefined,
    primaryArtist,
    normalized_title: normalizeSongTitle(title),
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
    const isOfficial = BASE_URLS[currentBaseIndex].includes("jiosaavn.com");
    let data: any;

    if (isOfficial) {
      data = await request("/api.php", {
        __call: "search.getResults",
        _format: "json",
        p: 1,
        n: limit,
        q: query,
      }, signal);
    } else {
      data = await request(`/search/songs`, { query, limit }, signal);
    }

    const results: SaavnSong[] = data?.results ?? data?.data?.results ?? (Array.isArray(data) ? data : []);
    const mapped = results.map(mapSaavnToSong).filter(Boolean) as Song[];

    const sorted = mapped.sort((a, b) => getSearchPriority(b.title) - getSearchPriority(a.title));

    if (sorted.length > 0) {
      searchCache.set(cacheKey, sorted);
    }
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
  if (!id) return null;
  if (songByIdCache.has(id)) {
    return songByIdCache.get(id)!;
  }

  try {
    const isOfficial = BASE_URLS[currentBaseIndex].includes("jiosaavn.com");
    let data: any;

    if (isOfficial) {
      data = await request("/api.php", {
        __call: "song.getDetails",
        _format: "json",
        pids: id,
      });
      if (data && data[id]) {
        const song = mapSaavnToSong(data[id]);
        if (song) {
          songByIdCache.set(id, song);
          return song;
        }
      }
    }

    try {
      data = await request(`/songs/${id}`);
    } catch {
      data = await request(`/songs`, { id });
    }

    const results: SaavnSong[] = Array.isArray(data?.data) ? data.data : data?.data ? [data.data] : [];
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
    const song = await getSongById(id);
    if (!song) return [];

    const isOfficial = BASE_URLS[currentBaseIndex].includes("jiosaavn.com");
    let data: any;

    if (isOfficial) {
      data = await request("/api.php", {
        __call: "reco.getreco",
        _format: "json",
        pid: id,
      });
      const results: SaavnSong[] = Array.isArray(data) ? data : data ? Object.values(data) : [];
      let mapped = results.map(mapSaavnToSong).filter(Boolean) as Song[];

      if (mapped.length === 0 && song.artist) {
        mapped = await searchSongs(`${song.artist} songs`, 15);
      }

      if (mapped.length > 0) {
        relatedSongsCache.set(id, mapped);
      }
      return mapped;
    }

    data = await request(`/songs/${id}/suggestions`, { limit: 20 });
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
    const langQuery = language.split(",").map((l) => `${l.trim()} top hits`).join(" ");
    return await searchSongs(langQuery || "trending songs", 30);
  } catch {
    return [];
  }
}

export async function resolveSong(title: string, artist: string, id?: string): Promise<Song | null> {
  if (id && id !== "unknown" && !id.startsWith("local:")) {
    const byId = await getSongById(id);
    if (byId && byId.url) return byId;
  }

  const firstArtist = artist ? artist.split(/[;,]/)[0].trim() : "";
  const cleanTitle = title ? title.replace(/[^\p{L}\p{N}\s]/gu, "").trim() : "";
  const firstWord = title ? title.split(/\s+/)[0] : "";

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

