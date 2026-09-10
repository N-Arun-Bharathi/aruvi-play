export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  url: string;
  artwork?: string;
  lyrics?: string;
  hasLyrics?: boolean;
  lyricsSnippet?: string;
  language?: string;
  year?: string;
  primaryArtist?: string;
  primaryArtists?: string;
  musicDirector?: string;
  source?: "online" | "local";
}

export interface LyricsLine {
  time?: number;
  text: string;
}

export interface LyricsData {
  lyrics: string;
  lines: LyricsLine[];
  snippet?: string;
  copyright?: string;
  isSynced: boolean;
  source: "jiosaavn" | "lrclib";
}
