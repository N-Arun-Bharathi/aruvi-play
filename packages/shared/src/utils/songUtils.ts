import { Song } from "../types/song";

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
  "ajay-atul",
];

export function normalizeSongTitle(title: string): string {
  if (!title) return "";
  let normalized = title.toLowerCase();
  normalized = normalized.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "");
  const separators = [" - ", " | ", " ~ ", " – ", " — "];
  for (const sep of separators) {
    if (normalized.includes(sep)) {
      const parts = normalized.split(sep);
      if (parts[0].trim().length > 0) {
        normalized = parts[0];
      }
    }
  }

  const termsToRemove = [
    "official lyric video",
    "official music video",
    "official video",
    "lyric video",
    "music video",
    "full video song",
    "video song",
    "full song",
    "audio song",
    "audio",
    "reloaded",
    "remix",
    "reprise",
    "cover",
    "karaoke",
    "instrumental",
    "slowed",
    "reverb",
    "sped up",
    "lofi",
    "lo-fi",
    "edit",
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

  normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, "");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

export function extractPrimaryArtist(song: Song): string {
  if (song.musicDirector && song.musicDirector.trim().length > 0) {
    return song.musicDirector.trim();
  }
  if (song.primaryArtist && song.primaryArtist.trim().length > 0) {
    return song.primaryArtist.trim();
  }
  if (song.primaryArtists && song.primaryArtists.trim().length > 0) {
    const parts = song.primaryArtists.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
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

function getTitleStem(title: string): string {
  if (!title) return "";
  let norm = title.toLowerCase().replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "");
  const separators = [" - ", " | ", " ~ ", " – ", " — "];
  for (const sep of separators) {
    if (norm.includes(sep)) {
      const parts = norm.split(sep);
      if (parts[0].trim().length > 0) norm = parts[0];
    }
  }
  norm = norm
    .replace(/\breloaded\b/g, "")
    .replace(/\bremix\b/g, "")
    .replace(/\breprise\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return norm.split(" ")[0] || norm;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

export function isSameSongStem(title1: string, title2: string): boolean {
  const stem1 = getTitleStem(title1);
  const stem2 = getTitleStem(title2);
  if (!stem1 || !stem2) return false;
  if (stem1 === stem2) return true;
  if (stem1.startsWith(stem2) || stem2.startsWith(stem1)) return true;
  if (Math.abs(stem1.length - stem2.length) <= 2 && levenshtein(stem1, stem2) <= 1 && stem1.length >= 4) return true;
  return false;
}

export function isAlternateVersion(candidate: Song, currentSong: Song): boolean {
  if (!candidate || !currentSong) return false;
  if (isSameSongStem(candidate.title, currentSong.title)) return true;
  const norm1 = normalizeSongTitle(candidate.title);
  const norm2 = normalizeSongTitle(currentSong.title);
  return norm1.length > 0 && norm1 === norm2;
}

export function isDuplicateSong(candidate: Song, existingSongs: Song[]): boolean {
  if (!candidate || !existingSongs || existingSongs.length === 0) return false;
  return existingSongs.some((s) => isAlternateVersion(candidate, s));
}

export function getSearchPriority(song: Song, preferredLangs?: string[]): number {
  let score = 0;
  if (preferredLangs && preferredLangs.length > 0 && song.language) {
    if (preferredLangs.some((l) => l.toLowerCase() === song.language?.toLowerCase())) {
      score += 10;
    }
  }
  return score;
}
