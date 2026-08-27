export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  url: string;
  artwork?: string;
  lyrics?: string;
  language?: string;
  year?: string;
  primaryArtist?: string;
  primaryArtists?: string;
  musicDirector?: string;
  source?: "online" | "local";
}
