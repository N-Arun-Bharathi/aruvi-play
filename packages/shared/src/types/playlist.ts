import { Song } from "./song";

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  songs: Song[];
  user_id?: string;
  created_at: string;
}
