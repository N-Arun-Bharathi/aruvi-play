import { Song } from "./song";

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  songs: Song[];
  isPublic: boolean;
  createdAt: string;
}
