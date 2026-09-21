import axios, { AxiosInstance } from "axios";
import CryptoJS from "crypto-js";
import { Song, SaavnSong, SaavnPlaylist } from "../types/song";
export type { SaavnPlaylist };
import { detectSongContext } from "../utils/contextDetector";
import { getSearchPriority, normalizeSongTitle } from "../utils/songUtils";

export let apiCallCount = 0;
export const getApiCallCount = () => apiCallCount;

const searchCache = new Map<string, Song[]>();
const relatedSongsCache = new Map<string, Song[]>();
const songByIdCache = new Map<string, Song>();

const BASE_URLS = [
  "https://www.jiosaavn.com",
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
      .replace("_160.mp3", "_320.mp3")
      .replace(/^http:/, "https:");
  } catch (error) {
    console.error("Error decrypting media URL:", error);
    return undefined;
  }
}

async function request(
  url: string,
  params: any = {},
  signal?: AbortSignal,
  headers: Record<string, string> = {}
): Promise<any> {
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

      const res = await client.get(reqUrl, {
        params,
        signal,
        headers: {
          ...headers,
        },
      });

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
    if (url) return url.replace("50x50", "500x500").replace("150x150", "500x500").replace(/^http:/, "https:");
  }
  return undefined;
}

function pickUrl(s: SaavnSong | any): string | undefined {
  const encUrl =
    s.encrypted_media_url ||
    s.more_info?.encrypted_media_url ||
    s.encryptedMediaUrl ||
    s.more_info?.encryptedMediaUrl;
  if (encUrl) {
    const decrypted = decryptMediaUrl(encUrl);
    if (decrypted) return decrypted;
  }

  const vlinkUrl = s.vlink || s.more_info?.vlink;
  if (vlinkUrl && typeof vlinkUrl === "string" && vlinkUrl.startsWith("http")) {
    return vlinkUrl;
  }

  const previewUrl =
    s.media_preview_url ||
    s.more_info?.media_preview_url ||
    s.mediaPreviewUrl ||
    s.more_info?.mediaPreviewUrl;
  if (previewUrl) {
    const decrypted = decryptMediaUrl(previewUrl);
    if (decrypted) return decrypted;
  }

  // Fallback to downloadUrl if present and valid
  const downloadUrl = s.downloadUrl || s.more_info?.downloadUrl;
  if (Array.isArray(downloadUrl) && downloadUrl.length > 0) {
    const high = downloadUrl.find((d: any) => d.quality === "320kbps");
    const fallback = downloadUrl[downloadUrl.length - 1];
    const url = (high ?? fallback)?.url ?? (high ?? fallback)?.link;
    if (url) return url.replace(/^http:/, "https:");
  }

  return undefined;
}

function artistName(s: SaavnSong | any): string {
  const primaryArtistsStr =
    s.primary_artists ||
    s.primaryArtists ||
    s.more_info?.primary_artists ||
    s.singers ||
    s.more_info?.singers;
  if (typeof primaryArtistsStr === "string" && primaryArtistsStr.trim().length > 0) {
    return primaryArtistsStr;
  }

  const primary = s.artists?.primary;
  if (primary?.length) return primary.map((a: any) => a.name).join(", ");

  const artistMap = s.more_info?.artistMap;
  if (artistMap) {
    if (Array.isArray(artistMap.primary_artists) && artistMap.primary_artists.length > 0) {
      return artistMap.primary_artists.map((a: any) => a.name).join(", ");
    }
    if (Array.isArray(artistMap.artists) && artistMap.artists.length > 0) {
      return artistMap.artists.map((a: any) => a.name).join(", ");
    }
  }

  if (s.subtitle && typeof s.subtitle === "string" && s.subtitle.includes("-")) {
    return s.subtitle.split("-")[0].trim();
  }

  return "Unknown";
}

function albumName(s: SaavnSong | any): string {
  if (s.more_info?.album && typeof s.more_info.album === "string") return s.more_info.album;
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

  // Check top-level and more_info music director fields
  const rawMusic =
    s.music ||
    s.music_director ||
    s.more_info?.music ||
    s.more_info?.music_director ||
    (Array.isArray(s.more_info?.artistMap?.music) && s.more_info.artistMap.music[0]?.name) ||
    (Array.isArray(s.artist_map?.music) && s.artist_map.music[0]?.name);

  if (typeof rawMusic === "string" && rawMusic.trim().length > 0) {
    musicDirector = decodeHtml(rawMusic).trim();
  }

  if (s.artists) {
    if (Array.isArray(s.artists.all)) {
      s.artists.all.forEach((a: any) => {
        if (a.name) {
          const name = decodeHtml(a.name).trim();
          if (name && !artistsList.includes(name)) {
            artistsList.push(name);
          }
          if ((a.role === "music" || a.role === "composer" || a.role === "music_director") && !musicDirector) {
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
          if ((a.role === "music" || a.role === "composer" || a.role === "music_director") && !musicDirector) {
            musicDirector = name;
          }
          if (!primaryArtist) {
            primaryArtist = name;
          }
        }
      });
    }
  }

  const primaryArtistsStr =
    s.primary_artists ||
    s.primaryArtists ||
    s.more_info?.primary_artists
      ? decodeHtml(s.primary_artists || s.primaryArtists || s.more_info?.primary_artists)
      : "";
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
    musicDirector: musicDirector || undefined,
    primaryArtist,
  } as Song;
  const context = detectSongContext(tempSongForContext);

  const lang = s.language ? s.language.toLowerCase() : s.more_info?.language ? s.more_info.language.toLowerCase() : context.language;

  const rawDuration = s.more_info?.duration || s.duration;
  const duration = typeof rawDuration === "string" ? parseInt(rawDuration, 10) : (rawDuration || 0);

  const rawArtwork = s.image || s.artwork_url || s.more_info?.image || s.more_info?.artwork_url;

  return {
    id: String(s.id),
    title,
    artist: mappedArtist,
    album: decodeHtml(albumName(s)),
    artwork: pickImage(rawArtwork),
    url,
    duration,
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

export function clearSearchCache() {
  searchCache.clear();
  relatedSongsCache.clear();
}

export async function searchSongs(query: string, limit = 20, signal?: AbortSignal): Promise<Song[]> {
  if (!query.trim()) return [];

  let preferredLangs: string[] = ["tamil"];
  try {
    const { useSettingsStore } = require("../store/settingsStore");
    preferredLangs = useSettingsStore.getState().languages || ["tamil"];
  } catch (e) {}

  const cacheKey = `${query.trim().toLowerCase()}:${limit}:${preferredLangs.join(",")}`;
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

    const sorted = mapped.sort((a, b) => getSearchPriority(b, preferredLangs) - getSearchPriority(a, preferredLangs));

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

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricLine[];
  plainText: string;
}

export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const matches = Array.from(line.matchAll(timeRegex));
    if (matches.length > 0) {
      const text = line.replace(timeRegex, "").trim();
      if (text) {
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseFloat(match[2]);
          const time = minutes * 60 + seconds;
          result.push({ time, text });
        }
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

export async function getSongLyrics(
  songId?: string,
  title?: string,
  artist?: string
): Promise<LyricsData | null> {
  const cleanTitle = (title || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/feat\..*/i, "")
    .trim();
  const firstArtist = artist ? artist.split(/[;,/]/)[0].trim() : "";

  // 1. Primary: Query LRCLIB API for real-time synchronized LRC lyrics
  if (cleanTitle) {
    try {
      const lrcRes = await axios.get("https://lrclib.net/api/get", {
        params: {
          track_name: cleanTitle,
          artist_name: firstArtist,
        },
        headers: {
          "User-Agent": "AruviPlay/1.0.0 (https://aruvi.app)",
        },
        timeout: 6000,
      });

      if (lrcRes.data?.syncedLyrics) {
        const lines = parseLrc(lrcRes.data.syncedLyrics);
        if (lines.length > 0) {
          return {
            synced: true,
            lines,
            plainText: lrcRes.data.plainLyrics || lines.map((l) => l.text).join("\n"),
          };
        }
      }
      if (lrcRes.data?.plainLyrics) {
        const plain: string = lrcRes.data.plainLyrics.trim();
        const lines: LyricLine[] = plain
          .split("\n")
          .filter((l: string) => l.trim().length > 0)
          .map((t: string, idx: number) => ({ time: idx * 4, text: t.trim() }));
        return { synced: false, lines, plainText: plain };
      }
    } catch (e) {}

    // LRCLIB Search fallback
    try {
      const searchRes = await axios.get("https://lrclib.net/api/search", {
        params: { q: `${cleanTitle} ${artist || ""}`.trim() },
        headers: {
          "User-Agent": "AruviPlay/1.0.0 (https://aruvi.app)",
        },
        timeout: 6000,
      });

      if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        const syncedItem = searchRes.data.find((x: any) => x.syncedLyrics);
        if (syncedItem?.syncedLyrics) {
          const lines = parseLrc(syncedItem.syncedLyrics);
          if (lines.length > 0) {
            return {
              synced: true,
              lines,
              plainText: syncedItem.plainLyrics || lines.map((l: LyricLine) => l.text).join("\n"),
            };
          }
        }
        const plainItem = searchRes.data.find((x: any) => x.plainLyrics);
        if (plainItem?.plainLyrics) {
          const plain: string = plainItem.plainLyrics.trim();
          const lines: LyricLine[] = plain
            .split("\n")
            .filter((l: string) => l.trim().length > 0)
            .map((t: string, idx: number) => ({ time: idx * 4, text: t.trim() }));
          return { synced: false, lines, plainText: plain };
        }
      }
    } catch (err) {}
  }

  // 2. Direct JioSaavn lyrics.getLyrics by songId
  if (songId && !songId.startsWith("local:")) {
    try {
      let data = await request("/api.php", {
        __call: "lyrics.getLyrics",
        lyrics_id: songId,
        ctx: "web6dot0",
        api_version: 4,
        _format: "json",
        _marker: "0",
      });
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {}
      }
      if (data && data.lyrics) {
        const plain: string = decodeHtml(data.lyrics).trim();
        const lines: LyricLine[] = plain
          .split("\n")
          .filter((l: string) => l.trim().length > 0)
          .map((t: string, idx: number) => ({ time: idx * 4, text: t.trim() }));
        return { synced: false, lines, plainText: plain };
      }
    } catch (e) {
      console.warn("JioSaavn lyrics error:", e);
    }
  }

  // 3. Fallback: Search Saavn autocomplete to find canonical JioSaavn ID
  if (cleanTitle) {
    try {
      let sData = await request("/api.php", {
        __call: "autocomplete.get",
        query: cleanTitle,
        _format: "json",
        _marker: "0",
        ctx: "web6dot0",
      });
      if (typeof sData === "string") {
        try {
          sData = JSON.parse(sData);
        } catch (e) {}
      }

      const songItem = sData?.songs?.data?.[0];
      if (songItem?.id && songItem.id !== songId) {
        let lData = await request("/api.php", {
          __call: "lyrics.getLyrics",
          lyrics_id: songItem.id,
          ctx: "web6dot0",
          api_version: 4,
          _format: "json",
          _marker: "0",
        });
        if (typeof lData === "string") {
          try {
            lData = JSON.parse(lData);
          } catch (e) {}
        }
        if (lData && lData.lyrics) {
          const plain: string = decodeHtml(lData.lyrics).trim();
          const lines: LyricLine[] = plain
            .split("\n")
            .filter((l: string) => l.trim().length > 0)
            .map((t: string, idx: number) => ({ time: idx * 4, text: t.trim() }));
          return { synced: false, lines, plainText: plain };
        }
      }
    } catch (e) {}
  }

  return null;
}

function pickPlaylistImage(image: any): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") {
    return image
      .replace("50x50", "500x500")
      .replace("150x150", "500x500")
      .replace(/^http:/, "https:");
  }
  if (Array.isArray(image) && image.length > 0) {
    const high = image.find((i: any) => i.quality === "500x500");
    const fallback = image[image.length - 1];
    const url = high?.url || high?.link || fallback?.url || fallback?.link;
    if (url) return url.replace("50x50", "500x500").replace("150x150", "500x500").replace(/^http:/, "https:");
  }
  return undefined;
}

export async function getPlaylistDetails(listId: string): Promise<SaavnPlaylist | null> {
  if (!listId) return null;
  apiCallCount++;

  try {
    const data = await request("/api.php", {
      __call: "playlist.getDetails",
      listid: listId,
      _format: "json",
      _marker: "0",
      api_version: "4",
      ctx: "web6dot0",
    });

    if (!data) return null;

    const rawList: any[] = data.list || data.songs || [];
    const songs: Song[] = rawList
      .map(mapSaavnToSong)
      .filter((s: Song | null): s is Song => s !== null);

    return {
      id: String(data.id || data.listid || listId),
      title: decodeHtml(data.title || data.listname || "Untitled Playlist"),
      subtitle: decodeHtml(data.subtitle || data.header_desc || ""),
      headerDesc: decodeHtml(data.header_desc || ""),
      image: pickPlaylistImage(data.image),
      songCount: data.list_count ? parseInt(data.list_count, 10) : songs.length,
      followerCount: data.more_info?.follower_count || data.follower_count,
      permaUrl: data.perma_url,
      language: data.language,
      songs,
    };
  } catch (err) {
    console.error("Failed to get playlist details:", err);
    return null;
  }
}

export async function searchPlaylistsPaged(
  query: string,
  limit = 20,
  page = 1
): Promise<{ playlists: SaavnPlaylist[]; total: number; page: number }> {
  if (!query.trim()) return { playlists: [], total: 0, page };
  apiCallCount++;

  try {
    const data = await request("/api.php", {
      __call: "search.getPlaylistResults",
      q: query,
      _format: "json",
      _marker: "0",
      api_version: "4",
      n: limit,
      p: page,
      ctx: "web6dot0",
    });

    const rawList: any[] = data?.results || [];
    const total = parseInt(data?.total || "0", 10) || rawList.length;
    const playlists = rawList.map((item: any) => ({
      id: String(item.id || item.listid),
      title: decodeHtml(item.title || item.name || "Untitled Playlist"),
      subtitle: decodeHtml(item.subtitle || item.description || ""),
      headerDesc: decodeHtml(item.header_desc || ""),
      image: pickPlaylistImage(item.image),
      songCount: item.more_info?.song_count
        ? parseInt(item.more_info.song_count, 10)
        : item.song_count
        ? parseInt(item.song_count, 10)
        : undefined,
      followerCount: item.more_info?.follower_count || item.follower_count,
      permaUrl: item.perma_url,
      language: item.language || item.more_info?.language,
    }));

    return { playlists, total, page };
  } catch (err) {
    console.error("Failed to search playlists paged:", err);
    return { playlists: [], total: 0, page };
  }
}

export async function searchPlaylists(query: string, limit = 20, page = 1): Promise<SaavnPlaylist[]> {
  const res = await searchPlaylistsPaged(query, limit, page);
  return res.playlists;
}

export async function getFeaturedPlaylists(languages: string[] = ["tamil"]): Promise<SaavnPlaylist[]> {
  apiCallCount++;
  const validLangs = languages && languages.length > 0 ? languages : ["tamil"];
  const langStr = validLangs.map((l) => l.trim().toLowerCase()).join(",");

  try {
    const data = await request(
      "/api.php",
      {
        __call: "webapi.getLaunchData",
        _format: "json",
        _marker: "0",
        api_version: "4",
        ctx: "web6dot0",
      },
      undefined,
      {
        Cookie: `L=${encodeURIComponent(langStr)}`,
      }
    );

    const topPlaylists: any[] = data?.top_playlists || [];
    const charts: any[] = (data?.charts || []).filter((c: any) => c.type === "playlist");

    const combined = [...topPlaylists, ...charts];

    // Verify if returned playlists correspond to requested languages
    const isHindiRequested = validLangs.some((l) => l.toLowerCase().includes("hindi"));
    const matchesUserLang = combined.some((item: any) => {
      const title = (item.title || "").toLowerCase();
      const sub = (item.subtitle || "").toLowerCase();
      return validLangs.some((l) => title.includes(l.toLowerCase()) || sub.includes(l.toLowerCase()));
    });

    if (combined.length > 0 && (matchesUserLang || isHindiRequested)) {
      const seen = new Set<string>();
      const playlists: SaavnPlaylist[] = [];
      for (const item of combined) {
        const id = String(item.id || item.listid);
        if (!seen.has(id)) {
          seen.add(id);
          playlists.push({
            id,
            title: decodeHtml(item.title || item.name || "Featured Playlist"),
            subtitle: decodeHtml(item.subtitle || (item.count ? `${item.count} Songs` : "")),
            headerDesc: decodeHtml(item.header_desc || ""),
            image: pickPlaylistImage(item.image),
            songCount: item.more_info?.song_count
              ? parseInt(item.more_info.song_count, 10)
              : item.count
              ? parseInt(item.count, 10)
              : undefined,
            followerCount: item.more_info?.follower_count || item.follower_count,
            permaUrl: item.perma_url,
            language: item.language || item.more_info?.language,
          });
        }
      }
      return playlists;
    }

    const searchQueries = validLangs.map((l) => `${l} trending hits`);
    const searchResults = await Promise.all(searchQueries.map((q) => searchPlaylists(q, 10)));
    return searchResults.flat();
  } catch (err) {
    console.error("Failed to get featured playlists:", err);
    try {
      return await searchPlaylists(`${validLangs[0] || "tamil"} hits`, 15);
    } catch {
      return [];
    }
  }
}



