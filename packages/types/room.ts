import { Song } from "./song";

export interface RoomMember {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  joined_at: string;
}

export interface MusicRoom {
  code: string;
  name: string;
  host_id: string;
  current_song?: Song | null;
  is_playing: boolean;
  position_seconds: number;
  members: RoomMember[];
  queue: Song[];
}
