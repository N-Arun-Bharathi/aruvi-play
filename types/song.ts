export type SongSource = "online" | "local";

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  url: string;
  duration?: number;
  source: SongSource;
  primaryArtists?: string;
}

export type RepeatMode = "off" | "one" | "all";

export interface SaavnSearchResponse {
  data: {
    results: SaavnSong[];
  };
}

export interface SaavnSong {
  id: string;
  name: string;
  album: { id: string; name: string } | string;
  duration: string | number;
  image: Array<{ quality: string; url?: string; link?: string }> | string;
  downloadUrl: Array<{ quality: string; url?: string; link?: string }>;
  primaryArtists?: string;
  artists?: { primary?: Array<{ name: string }> };
  language?: string;
}
