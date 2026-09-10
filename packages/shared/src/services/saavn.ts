import axios, { AxiosInstance } from "axios";
import CryptoJS from "crypto-js";
import { Song, SaavnSong, LyricsData, LyricsLine } from "../types/song";
import { detectSongContext } from "../utils/contextDetector";
import { getSearchPriority, normalizeSongTitle } from "../utils/songUtils";

export let apiCallCount = 0;
export const getApiCallCount = () => apiCallCount;

const searchCache = new Map<string, Song[]>();
const relatedSongsCache = new Map<string, Song[]>();
const songByIdCache = new Map<string, Song>();
const lyricsCache = new Map<string, LyricsData>();

const isBrowser = typeof window !== "undefined";

const API_ENDPOINTS = isBrowser
  ? ["/jiosaavn-api", "https://www.jiosaavn.com"]
  : ["https://www.jiosaavn.com"];

let currentIndex = 0;

function createClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      Accept: "application/json, text/plain, */*",
    },
  });
}

let client = createClient(API_ENDPOINTS[currentIndex]);

function rotateApi() {
  currentIndex = (currentIndex + 1) % API_ENDPOINTS.length;
  client = createClient(API_ENDPOINTS[currentIndex]);
  console.log(`Switched API base to: ${API_ENDPOINTS[currentIndex]}`);
}

export function decryptMediaUrl(encryptedUrl?: string): string | undefined {
  if (!encryptedUrl || typeof encryptedUrl !== "string") return undefined;
  try {
    const key = CryptoJS.enc.Utf8.parse("38346591");
    const decrypted = CryptoJS.DES.decrypt(
      CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl),
      }),
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr || !decryptedStr.includes("http")) return undefined;

    return decryptedStr
      .replace("_96.mp4", "_320.mp4")
      .replace("_96.mp3", "_320.mp3")
      .replace("_160.mp4", "_320.mp4")
      .replace("_160.mp3", "_320.mp3");
  } catch (err) {
    return undefined;
  }
}

function decodeHtml(s?: string): string {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function mapSaavnToSong(s: any): Song | null {
  if (!s) return null;

  const encUrl = s.encrypted_media_url || s.more_info?.encrypted_media_url;
  const vlinkUrl = s.vlink || s.more_info?.vlink;
  const previewUrl = s.media_preview_url || s.more_info?.media_preview_url;

  const id = String(s.id || encUrl || Math.random());
  const rawTitle = s.song || s.name || s.title || "Unknown Track";
  const title = decodeHtml(rawTitle);

  let artist = "";
  let primaryArtist = "";

  const primaryArtistsStr =
    s.primary_artists ||
    s.primaryArtists ||
    s.more_info?.primary_artists ||
    s.singers ||
    s.more_info?.singers ||
    s.music ||
    s.more_info?.music;

  if (typeof primaryArtistsStr === "string" && primaryArtistsStr.trim().length > 0) {
    artist = decodeHtml(primaryArtistsStr);
    primaryArtist = artist.split(",")[0].trim();
  } else if (s.artists && typeof s.artists === "object") {
    if (Array.isArray(s.artists.primary) && s.artists.primary.length > 0) {
      const names = s.artists.primary.map((a: any) => decodeHtml(a.name)).filter(Boolean);
      artist = names.join(", ");
      primaryArtist = names[0] || "";
    }
  } else if (s.more_info?.artistMap) {
    const map = s.more_info.artistMap;
    if (Array.isArray(map.primary_artists) && map.primary_artists.length > 0) {
      const names = map.primary_artists.map((a: any) => decodeHtml(a.name)).filter(Boolean);
      artist = names.join(", ");
      primaryArtist = names[0] || "";
    } else if (Array.isArray(map.artists) && map.artists.length > 0) {
      const names = map.artists.map((a: any) => decodeHtml(a.name)).filter(Boolean);
      artist = names.join(", ");
      primaryArtist = names[0] || "";
    }
  }
  if (!artist) artist = "Unknown Artist";

  let artwork: string | undefined = undefined;
  const rawImage = s.image || s.more_info?.image;
  if (typeof rawImage === "string") {
    artwork = rawImage.replace("150x150", "500x500").replace("50x50", "500x500").replace(/^http:/, "https:");
  } else if (Array.isArray(rawImage) && rawImage.length > 0) {
    const highestQuality = rawImage[rawImage.length - 1];
    artwork = highestQuality.url || highestQuality.link;
    if (artwork) artwork = artwork.replace("150x150", "500x500").replace("50x50", "500x500").replace(/^http:/, "https:");
  }

  let url: string | undefined = undefined;

  // 1. Official DES Decryption of encrypted_media_url (yields 200 OK audio/mp4 CDN stream)
  if (encUrl) {
    url = decryptMediaUrl(encUrl);
  }

  // 2. Jio Tune vlink fallback (100% verified 200 OK audio/mpeg stream)
  if (!url && vlinkUrl) {
    url = vlinkUrl;
  }

  // 3. downloadUrl array fallback
  const downloadUrlArr = s.downloadUrl || s.more_info?.downloadUrl;
  if (!url && Array.isArray(downloadUrlArr) && downloadUrlArr.length > 0) {
    const d320 = downloadUrlArr.find((d: any) => d.quality === "320kbps");
    const d160 = downloadUrlArr.find((d: any) => d.quality === "160kbps");
    const d96 = downloadUrlArr.find((d: any) => d.quality === "96kbps");
    const fallback = downloadUrlArr[downloadUrlArr.length - 1];
    url = (d320 ?? d160 ?? d96 ?? fallback)?.url || (d320 ?? d160 ?? d96 ?? fallback)?.link;
    if (url) url = url.replace(/^http:/, "https:");
  }

  // 4. Preview URL fallback
  if (!url && previewUrl) {
    url = previewUrl
      .replace("preview.saavncdn.com", "aac.saavncdn.com")
      .replace("_96_p.mp4", "_320.mp4")
      .replace("_96_p.mp3", "_320.mp3");
  }

  if (!url) return null;

  const durationStr = s.duration || s.more_info?.duration;
  const duration = durationStr ? parseInt(String(durationStr), 10) : 0;
  const albumName = typeof s.album === "string" ? s.album : s.album?.name || s.more_info?.album;

  const mapped: Song = {
    id,
    title,
    artist,
    album: decodeHtml(albumName),
    artwork,
    url,
    duration,
    source: "online",
    primaryArtist,
    primaryArtists: s.primary_artists || s.primaryArtists || s.more_info?.primary_artists,
    musicDirector: s.music || s.more_info?.music,
    language: s.language || s.more_info?.language,
    hasLyrics: s.has_lyrics === "true" || s.more_info?.has_lyrics === "true",
    lyricsSnippet: s.lyrics_snippet || s.more_info?.lyrics_snippet ? decodeHtml(s.lyrics_snippet || s.more_info?.lyrics_snippet) : undefined,
    normalized_title: normalizeSongTitle(title),
  };

  const context = detectSongContext(mapped);
  mapped.mood = context.mood;
  mapped.energy = context.energy;

  return mapped;
}

export async function searchSongs(query: string, preferredLangs?: string[]): Promise<Song[]> {
  if (!query.trim()) return [];
  const cacheKey = `${query.trim().toLowerCase()}_${(preferredLangs || []).join(",")}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  apiCallCount++;

  try {
    const res = await client.get("/api.php", {
      params: {
        __call: "search.getResults",
        q: query,
        _format: "json",
        _marker: "0",
        api_version: "4",
        n: 30,
        p: 1,
      },
    });

    const rawList: any[] = res.data?.results || res.data?.data?.results || (Array.isArray(res.data) ? res.data : []);

    const songs: Song[] = rawList
      .map(mapSaavnToSong)
      .filter((s: Song | null): s is Song => s !== null);

    songs.sort((a, b) => {
      const priorityA = getSearchPriority(a, preferredLangs);
      const priorityB = getSearchPriority(b, preferredLangs);
      return priorityB - priorityA;
    });

    if (songs.length > 0) {
      searchCache.set(cacheKey, songs);
      songs.forEach((s) => songByIdCache.set(s.id, s));
    }
    return songs;
  } catch (err) {
    console.warn("Primary API failed, rotating API base...", err);
    rotateApi();
    try {
      const res = await client.get("/api.php", {
        params: {
          __call: "search.getResults",
          q: query,
          _format: "json",
          _marker: "0",
          api_version: "4",
          n: 30,
          p: 1,
        },
      });

      const rawList: any[] = res.data?.results || res.data?.data?.results || (Array.isArray(res.data) ? res.data : []);

      const songs: Song[] = rawList
        .map(mapSaavnToSong)
        .filter((s: Song | null): s is Song => s !== null);

      songs.sort((a, b) => getSearchPriority(b, preferredLangs) - getSearchPriority(a, preferredLangs));
      if (songs.length > 0) {
        searchCache.set(cacheKey, songs);
        songs.forEach((s) => songByIdCache.set(s.id, s));
      }
      return songs;
    } catch (e2) {
      console.error("Secondary API search failed:", e2);
      return [];
    }
  }
}

export async function getTrendingSongs(preferredLangs?: string[]): Promise<Song[]> {
  const lang = preferredLangs && preferredLangs.length > 0 ? preferredLangs[0] : "tamil";
  const defaultQuery = `${lang} latest hits top 20`;
  return searchSongs(defaultQuery, preferredLangs);
}

export async function getRelatedSongs(songId: string): Promise<Song[]> {
  if (relatedSongsCache.has(songId)) {
    return relatedSongsCache.get(songId)!;
  }

  apiCallCount++;

  try {
    const res = await client.get("/api.php", {
      params: {
        __call: "reco.getreco",
        pid: songId,
        _format: "json",
        _marker: "0",
        api_version: "4",
      },
    });

    const rawList: any[] = Array.isArray(res.data) ? res.data : res.data?.results || [];

    const songs: Song[] = rawList
      .map(mapSaavnToSong)
      .filter((s: Song | null): s is Song => s !== null);

    relatedSongsCache.set(songId, songs);
    songs.forEach((s) => songByIdCache.set(s.id, s));
    return songs;
  } catch (err) {
    console.error("Failed to get related songs:", err);
    return [];
  }
}

export async function getSongById(id: string): Promise<Song | null> {
  if (songByIdCache.has(id)) {
    return songByIdCache.get(id)!;
  }
  const results = await searchSongs(id);
  return results.length > 0 ? results[0] : null;
}

/**
 * Parses and sanitizes raw HTML lyrics from JioSaavn into clean text and lines.
 */
export function cleanSaavnLyrics(rawHtml: string): { lyrics: string; lines: LyricsLine[] } {
  if (!rawHtml || typeof rawHtml !== "string") {
    return { lyrics: "", lines: [] };
  }

  let cleaned = rawHtml
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .trim();

  // Normalize multiple consecutive line breaks
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  const lines: LyricsLine[] = cleaned
    .split("\n")
    .map((l) => ({ text: l.trim() }))
    .filter((l) => l.text.length > 0);

  return { lyrics: cleaned, lines };
}

/**
 * Parses synchronized LRC format string into structured lines with timestamps.
 */
export function parseLrcLyrics(lrc: string): LyricsLine[] {
  if (!lrc || typeof lrc !== "string") return [];
  const lines: LyricsLine[] = [];
  const regex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;

  for (const rawLine of lrc.split("\n")) {
    const match = rawLine.trim().match(regex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseFloat(match[2]);
      const time = min * 60 + sec;
      const text = match[3].trim();
      if (text) {
        lines.push({ time, text });
      }
    } else {
      const clean = rawLine.trim();
      if (clean && !clean.startsWith("[")) {
        lines.push({ text: clean });
      }
    }
  }

  return lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

/**
 * Fetches lyrics for a song from JioSaavn, with LRCLIB fallback for synced lyrics.
 */
export async function getLyrics(
  songId: string,
  song?: Partial<Song>
): Promise<LyricsData | null> {
  if (!songId) return null;

  if (lyricsCache.has(songId)) {
    return lyricsCache.get(songId)!;
  }

  apiCallCount++;

  // 1. Try JioSaavn native lyrics API first
  try {
    const res = await client.get("/api.php", {
      params: {
        __call: "lyrics.getLyrics",
        lyrics_id: songId,
        ctx: "web6dot0",
        api_version: "4",
        _format: "json",
        _marker: "0",
      },
    });

    if (res.data && res.data.lyrics && typeof res.data.lyrics === "string" && res.data.lyrics.trim().length > 0) {
      const cleaned = cleanSaavnLyrics(res.data.lyrics);
      const lyricsData: LyricsData = {
        lyrics: cleaned.lyrics,
        lines: cleaned.lines,
        snippet: res.data.snippet ? decodeHtml(res.data.snippet) : undefined,
        copyright: res.data.lyrics_copyright ? decodeHtml(res.data.lyrics_copyright) : "Lyrics powered by JioSaavn",
        isSynced: false,
        source: "jiosaavn",
      };
      lyricsCache.set(songId, lyricsData);
      return lyricsData;
    }
  } catch (err) {
    console.warn("JioSaavn lyrics lookup failed, attempting fallback:", err);
  }

  // 2. Fallback to LRCLIB (provides Synced LRC & plain lyrics)
  if (song?.title) {
    try {
      const trackName = song.normalized_title || song.title;
      const artistName = song.primaryArtist || song.artist || "";
      const duration = song.duration ? Math.round(song.duration) : undefined;

      const lrclibRes = await axios.get("https://lrclib.net/api/get", {
        params: {
          track_name: trackName,
          artist_name: artistName,
          duration,
        },
        timeout: 6000,
      });

      if (lrclibRes.data) {
        const { syncedLyrics, plainLyrics } = lrclibRes.data;
        if (syncedLyrics) {
          const lines = parseLrcLyrics(syncedLyrics);
          const lyricsData: LyricsData = {
            lyrics: lines.map((l) => l.text).join("\n"),
            lines,
            isSynced: true,
            copyright: "Synced lyrics powered by LRCLIB",
            source: "lrclib",
          };
          lyricsCache.set(songId, lyricsData);
          return lyricsData;
        } else if (plainLyrics) {
          const lines: LyricsLine[] = plainLyrics
            .split("\n")
            .map((l: string) => ({ text: l.trim() }))
            .filter((l: { text: string }) => l.text.length > 0);
          const lyricsData: LyricsData = {
            lyrics: plainLyrics.trim(),
            lines,
            isSynced: false,
            copyright: "Lyrics powered by LRCLIB",
            source: "lrclib",
          };
          lyricsCache.set(songId, lyricsData);
          return lyricsData;
        }
      }
    } catch {
      // LRCLIB 404 / error
    }
  }

  return null;
}
