import axios, { AxiosInstance } from "axios";
import CryptoJS from "crypto-js";
import { Song, SaavnSong, SaavnPlaylist, LyricLine, LyricsData } from "../types/song";
import { detectSongContext } from "../utils/contextDetector";
import { getSearchPriority, normalizeSongTitle } from "../utils/songUtils";


export let apiCallCount = 0;
export const getApiCallCount = () => apiCallCount;

const searchCache = new Map<string, Song[]>();
const relatedSongsCache = new Map<string, Song[]>();
const songByIdCache = new Map<string, Song>();

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
  if (!artist && s.subtitle && typeof s.subtitle === "string") {
    artist = decodeHtml(s.subtitle.includes("-") ? s.subtitle.split("-")[0].trim() : s.subtitle);
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
    const res = await client.get("/api.php", {
      params: {
        __call: "playlist.getDetails",
        listid: listId,
        _format: "json",
        _marker: "0",
        api_version: "4",
        ctx: "web6dot0",
      },
    });

    const data = res.data;
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
    const res = await client.get("/api.php", {
      params: {
        __call: "search.getPlaylistResults",
        q: query,
        _format: "json",
        _marker: "0",
        api_version: "4",
        n: limit,
        p: page,
        ctx: "web6dot0",
      },
    });

    const rawList: any[] = res.data?.results || [];
    const total = parseInt(res.data?.total || "0", 10) || rawList.length;
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
    // 1. Try launch data with language cookie
    const res = await client.get("/api.php", {
      params: {
        __call: "webapi.getLaunchData",
        _format: "json",
        _marker: "0",
        api_version: "4",
        ctx: "web6dot0",
      },
      headers: {
        Cookie: `L=${encodeURIComponent(langStr)}`,
      },
    });

    const topPlaylists: any[] = res.data?.top_playlists || [];
    const charts: any[] = (res.data?.charts || []).filter((c: any) => c.type === "playlist");

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

    // 2. Fallback: Search for trending playlists in preferred languages
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
      const res = await client.get("/api.php", {
        params: {
          __call: "lyrics.getLyrics",
          lyrics_id: songId,
          ctx: "web6dot0",
          api_version: 4,
          _format: "json",
          _marker: "0",
        },
      });
      let data = res.data;
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
      const sRes = await client.get("/api.php", {
        params: {
          __call: "autocomplete.get",
          query: cleanTitle,
          _format: "json",
          _marker: "0",
          ctx: "web6dot0",
        },
      });
      let sData = sRes.data;
      if (typeof sData === "string") {
        try {
          sData = JSON.parse(sData);
        } catch (e) {}
      }

      const songItem = sData?.songs?.data?.[0];
      if (songItem?.id && songItem.id !== songId) {
        const lRes = await client.get("/api.php", {
          params: {
            __call: "lyrics.getLyrics",
            lyrics_id: songItem.id,
            ctx: "web6dot0",
            api_version: 4,
            _format: "json",
            _marker: "0",
          },
        });
        let lData = lRes.data;
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


