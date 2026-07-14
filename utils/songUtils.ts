import { Song } from "../types/song";

/**
 * Normalizes a song title by:
 * - Lowercasing
 * - Stripping content in brackets
 * - Splitting by hyphens/pipes to remove movie-name suffixes
 * - Removing specific common terms (remix, karaoke, official, cover, slowed, etc.)
 * - Removing punctuation and special characters (keeping letters, numbers, spaces, and Tamil characters)
 * - Collapsing multiple whitespaces
 */
export function normalizeSongTitle(title: string): string {
  if (!title) return "";

  // 1. Lowercase
  let normalized = title.toLowerCase();

  // 2. Remove anything inside brackets: () and []
  normalized = normalized.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "");

  // 3. Remove movie-name suffixes and descriptors starting with hyphen or vertical bar
  // Match a dash/pipe preceded and/or followed by whitespace and take first part
  const separators = [" - ", " | ", " ~ ", " – ", " — "];
  for (const sep of separators) {
    if (normalized.includes(sep)) {
      const parts = normalized.split(sep);
      if (parts[0].trim().length > 0) {
        normalized = parts[0];
      }
    }
  }

  // 4. Remove common terms on word boundaries
  const termsToRemove = [
    "official", "video", "lyrical", "lyric video", "lyric", "lyrics",
    "audio", "full song", "full video song", "full audio", "remix", "reprise",
    "karaoke", "instrumental", "slowed", "reverb", "sped up", "female version",
    "male version", "cover", "live", "status", "ringtone", "bgm", "theme"
  ];

  for (const term of termsToRemove) {
    const regex = new RegExp(`\\b${term}\\b`, "g");
    normalized = normalized.replace(regex, "");
  }

  // 5. Remove punctuation and special characters (keep tamil characters and alphanumeric characters)
  normalized = normalized.replace(/[^a-zA-Z0-9\u0B80-\u0BFF\s]/g, "");

  // 6. Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Extracts primary artist or music director from song details.
 * Prefers the music director for film songs, falls back to primaryArtist,
 * then first name in comma/semicolon separated list.
 */
export function extractPrimaryArtist(song: Song): string {
  if (song.musicDirector) {
    return song.musicDirector;
  }
  if (song.primaryArtist) {
    return song.primaryArtist;
  }
  if (song.artist) {
    const parts = song.artist.split(/[;,]/);
    if (parts.length > 0) {
      return parts[0].trim();
    }
  }
  return "";
}

/**
 * Checks if two songs are alternate versions of the same song (i.e. same normalized title).
 */
export function isAlternateVersion(candidate: Song, currentSong: Song): boolean {
  const norm1 = normalizeSongTitle(candidate.title);
  const norm2 = normalizeSongTitle(currentSong.title);
  return norm1 === norm2 && norm1.length > 0;
}

/**
 * Checks if candidate song is a duplicate of any song in existingSongs list.
 * Compares by track ID, URL, or title-artist combination.
 */
export function isDuplicateSong(candidate: Song, existingSongs: Song[]): boolean {
  const cTitle = candidate.title.toLowerCase().trim();
  const cArtist = candidate.artist.toLowerCase().trim();

  return existingSongs.some(s => {
    if (s.id === candidate.id) return true;
    if (s.url && candidate.url && s.url === candidate.url) return true;
    const sTitle = s.title.toLowerCase().trim();
    const sArtist = s.artist.toLowerCase().trim();
    return sTitle === cTitle && sArtist === cArtist;
  });
}

/**
 * Scores a candidate song relative to a seed song.
 * Reject same normalized title, duplicate URL/id, or already played recently (handled in queue building).
 */
export function scoreRecommendation(candidate: Song, seedSong: Song): number {
  if (isAlternateVersion(candidate, seedSong)) {
    return -Infinity;
  }

  const lowerTitle = candidate.title.toLowerCase();
  const isLowerPriority =
    lowerTitle.includes("remix") ||
    lowerTitle.includes("reprise") ||
    lowerTitle.includes("cover") ||
    lowerTitle.includes("karaoke") ||
    lowerTitle.includes("instrumental") ||
    lowerTitle.includes("slowed") ||
    lowerTitle.includes("reverb") ||
    lowerTitle.includes("sped up");

  let score = 0;

  // Same music director: +40
  if (candidate.musicDirector && seedSong.musicDirector &&
      candidate.musicDirector.toLowerCase() === seedSong.musicDirector.toLowerCase()) {
    score += 40;
  } else if (seedSong.musicDirector && candidate.artists) {
    const seedMD = seedSong.musicDirector.toLowerCase();
    if (candidate.artists.some(a => a.toLowerCase() === seedMD)) {
      score += 40;
    }
  } else if (candidate.musicDirector && seedSong.artists) {
    const candMD = candidate.musicDirector.toLowerCase();
    if (seedSong.artists.some(a => a.toLowerCase() === candMD)) {
      score += 40;
    }
  }

  // Same primary artist: +35
  if (candidate.primaryArtist && seedSong.primaryArtist &&
      candidate.primaryArtist.toLowerCase() === seedSong.primaryArtist.toLowerCase()) {
    score += 35;
  }

  // Same language: +20
  if (candidate.language && seedSong.language &&
      candidate.language.toLowerCase() === seedSong.language.toLowerCase()) {
    score += 20;
  }

  // Similar mood: +15
  if (candidate.mood && seedSong.mood &&
      candidate.mood.toLowerCase() === seedSong.mood.toLowerCase() &&
      candidate.mood.toLowerCase() !== "unknown") {
    score += 15;
  }

  // Similar energy: +15
  if (candidate.energy && seedSong.energy &&
      candidate.energy.toLowerCase() === seedSong.energy.toLowerCase()) {
    score += 15;
  }

  // Similar genre: +10
  if (candidate.genre && seedSong.genre &&
      candidate.genre.toLowerCase() === seedSong.genre.toLowerCase() &&
      candidate.genre.toLowerCase() !== "unknown") {
    score += 10;
  }

  // Same album: +5
  if (candidate.album && seedSong.album &&
      candidate.album.toLowerCase() === seedSong.album.toLowerCase()) {
    score += 5;
  }

  // Remix, cover, karaoke or instrumental version: -50
  if (isLowerPriority) {
    score -= 50;
  }

  return score;
}

/**
 * Computes priority score for search results layout.
 * Higher scores are displayed first.
 */
export function getSearchPriority(title: string): number {
  const lower = title.toLowerCase();

  const isRemix = lower.includes("remix") || lower.includes("reprise");
  const isCover = lower.includes("cover");
  const isKaraoke = lower.includes("karaoke");
  const isInstrumental = lower.includes("instrumental");
  const isSlowed = lower.includes("slowed") || lower.includes("reverb");
  const isSpedUp = lower.includes("sped up");
  const isStatus = lower.includes("status") || lower.includes("ringtone");
  const isBgmTheme = lower.includes("bgm") || lower.includes("theme");

  if (isRemix || isCover || isKaraoke || isInstrumental || isSlowed || isSpedUp || isStatus || isBgmTheme) {
    if (isStatus || isSlowed || isSpedUp) return -20;
    if (isKaraoke || isInstrumental) return -15;
    if (isCover) return -10;
    if (isRemix) return -5;
    return -5;
  }

  const isLyrical = lower.includes("lyrical") || lower.includes("lyric video") || lower.includes("lyrics");
  const isVideo = lower.includes("video") || lower.includes("music video") || lower.includes("video song");
  const isAudio = lower.includes("audio") || lower.includes("official audio") || lower.includes("full song");

  if (isAudio) return 10;

  // Clean original audio titles get highest priority
  if (!isVideo && !isLyrical) {
    return 10;
  }

  if (isVideo && !isLyrical) return 8;
  if (isLyrical) return 6;

  return 5;
}
