import { Song } from "../types/song";

// Known prominent Indian music directors to prioritize during artist extraction if present in artist strings
const KNOWN_MUSIC_DIRECTORS = [
  "anirudh ravichander",
  "anirudh",
  "a.r. rahman",
  "ar rahman",
  "harris jayaraj",
  "yuvan shankar raja",
  "g.v. prakash kumar",
  "gv prakash",
  "santhosh narayanan",
  "devi sri prasad",
  "dsp",
  "thaman s",
  "s. thaman",
  "ilaiyaraaja",
  "ilayaraja",
  "vidyasagar",
  "d. imman",
  "hiphop tamizha",
  "m.m. keeravani",
  "keeravani",
  "amit trivedi",
  "pritam",
  "vishal-shekhar",
  "shankar-ehsaan-loy",
  "sachin-jigar",
  "mithoon",
  "ajay-atul"
];

/**
 * Normalizes a song title by:
 * - Lowercasing
 * - Stripping content in brackets () and []
 * - Splitting by hyphens/pipes to remove movie-name suffixes
 * - Removing specific terms (official, video, lyrical, lyric video, audio, full song, remix, reprise, karaoke, instrumental, slowed, reverb, sped up, female version, male version, cover, live, status, ringtone, BGM, theme)
 * - Removing punctuation and special characters (keeping letters, numbers, spaces)
 * - Collapsing multiple whitespaces
 */
export function normalizeSongTitle(title: string): string {
  if (!title) return "";

  // 1. Lowercase
  let normalized = title.toLowerCase();

  // 2. Remove anything inside brackets: () and []
  normalized = normalized.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "");

  // 3. Remove movie-name suffixes and descriptors starting with hyphen, pipe, or tilde
  const separators = [" - ", " | ", " ~ ", " – ", " — "];
  for (const sep of separators) {
    if (normalized.includes(sep)) {
      const parts = normalized.split(sep);
      if (parts[0].trim().length > 0) {
        normalized = parts[0];
      }
    }
  }

  // 4. Remove specific terms on word boundaries (ordered by phrase length descending)
  const termsToRemove = [
    "official lyric video",
    "official music video",
    "official video",
    "official audio",
    "full video song",
    "full lyric video",
    "lyric video",
    "lyrical video",
    "music video",
    "video song",
    "full audio",
    "full song",
    "female version",
    "male version",
    "slowed + reverb",
    "slowed and reverb",
    "slowed & reverb",
    "sped up",
    "official",
    "video",
    "lyrical",
    "lyric",
    "lyrics",
    "audio",
    "remix",
    "reprise",
    "karaoke",
    "instrumental",
    "slowed",
    "reverb",
    "cover",
    "live",
    "status",
    "ringtone",
    "bgm",
    "theme",
    "version",
  ];

  for (const term of termsToRemove) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedTerm}\\b`, "gi");
    normalized = normalized.replace(regex, "");
  }

  // 5. Remove punctuation and special characters (keep letters, numbers, and spaces across all scripts)
  normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, "");

  // 6. Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Extracts primary artist or music director from song details.
 * Prefers the music director for film songs, falls back to primaryArtist,
 * then checks for known music directors in artist string before picking first valid artist.
 */
export function extractPrimaryArtist(song: Song): string {
  if (song.musicDirector && song.musicDirector.trim().length > 0) {
    return song.musicDirector.trim();
  }
  if (song.primaryArtist && song.primaryArtist.trim().length > 0) {
    return song.primaryArtist.trim();
  }
  if (song.primaryArtists && song.primaryArtists.trim().length > 0) {
    const parts = song.primaryArtists.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    // Check if any part matches a known music director
    for (const part of parts) {
      if (KNOWN_MUSIC_DIRECTORS.some((md) => part.toLowerCase().includes(md))) {
        return part;
      }
    }
    if (parts.length > 0) {
      return parts[0];
    }
  }
  if (song.artist && song.artist.trim().length > 0) {
    const parts = song.artist.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (KNOWN_MUSIC_DIRECTORS.some((md) => part.toLowerCase().includes(md))) {
        return part;
      }
    }
    if (parts.length > 0) {
      return parts[0];
    }
  }
  return "";
}

/**
 * Checks if two songs are alternate versions of the same song (i.e. same normalized title).
 */
export function isAlternateVersion(candidate: Song, currentSong: Song): boolean {
  if (!candidate || !currentSong) return false;
  const norm1 = normalizeSongTitle(candidate.title);
  const norm2 = normalizeSongTitle(currentSong.title);
  return norm1.length > 0 && norm1 === norm2;
}

/**
 * Checks if candidate song is a duplicate of any song in existingSongs list.
 * Compares by track ID, URL, or title-artist combination.
 */
export function isDuplicateSong(candidate: Song, existingSongs: Song[]): boolean {
  if (!candidate || !existingSongs || existingSongs.length === 0) return false;
  const cTitle = normalizeSongTitle(candidate.title);
  const cArtist = extractPrimaryArtist(candidate).toLowerCase().trim();

  return existingSongs.some((s) => {
    if (candidate.id && s.id && s.id === candidate.id) return true;
    if (candidate.url && s.url && s.url === candidate.url) return true;
    const sTitle = normalizeSongTitle(s.title);
    const sArtist = extractPrimaryArtist(s).toLowerCase().trim();
    if (cTitle.length > 0 && sTitle === cTitle) {
      if (!cArtist || !sArtist || cArtist === sArtist || sArtist.includes(cArtist) || cArtist.includes(sArtist)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Scores a candidate song relative to a seed song.
 * Reject same normalized title, duplicate URL/id, or alternate version (-Infinity).
 */
export function scoreRecommendation(candidate: Song, seedSong: Song): number {
  if (!candidate || !seedSong) return -Infinity;

  if (isAlternateVersion(candidate, seedSong)) {
    return -Infinity;
  }

  if (
    (candidate.id && seedSong.id && candidate.id === seedSong.id) ||
    (candidate.url && seedSong.url && candidate.url === seedSong.url)
  ) {
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
    lowerTitle.includes("sped up") ||
    lowerTitle.includes("status") ||
    lowerTitle.includes("bgm") ||
    lowerTitle.includes("theme");

  let score = 0;

  const candidateMD = (candidate.musicDirector || "").toLowerCase().trim();
  const seedMD = (seedSong.musicDirector || "").toLowerCase().trim();
  const candidatePA = extractPrimaryArtist(candidate).toLowerCase().trim();
  const seedPA = extractPrimaryArtist(seedSong).toLowerCase().trim();

  // Same music director: +40
  if (candidateMD && seedMD && candidateMD === seedMD) {
    score += 40;
  } else if (seedMD && candidate.artists && candidate.artists.some((a) => a.toLowerCase().trim() === seedMD)) {
    score += 40;
  } else if (candidateMD && seedSong.artists && seedSong.artists.some((a) => a.toLowerCase().trim() === candidateMD)) {
    score += 40;
  }

  // Same primary artist: +35
  if (candidatePA && seedPA && candidatePA === seedPA) {
    score += 35;
  } else if (candidatePA && seedSong.artists && seedSong.artists.some((a) => a.toLowerCase().trim() === candidatePA)) {
    score += 25;
  }

  // Same language: +20
  if (
    candidate.language &&
    seedSong.language &&
    candidate.language.toLowerCase().trim() === seedSong.language.toLowerCase().trim()
  ) {
    score += 20;
  }

  // Similar mood: +15
  if (
    candidate.mood &&
    seedSong.mood &&
    candidate.mood.toLowerCase().trim() === seedSong.mood.toLowerCase().trim() &&
    candidate.mood.toLowerCase().trim() !== "unknown"
  ) {
    score += 15;
  }

  // Similar energy: +15
  if (
    candidate.energy &&
    seedSong.energy &&
    candidate.energy.toLowerCase().trim() === seedSong.energy.toLowerCase().trim()
  ) {
    score += 15;
  }

  // Similar genre: +10
  if (
    candidate.genre &&
    seedSong.genre &&
    candidate.genre.toLowerCase().trim() === seedSong.genre.toLowerCase().trim() &&
    candidate.genre.toLowerCase().trim() !== "unknown"
  ) {
    score += 10;
  }

  // Same album: +5
  if (
    candidate.album &&
    seedSong.album &&
    candidate.album.toLowerCase().trim() === seedSong.album.toLowerCase().trim()
  ) {
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

