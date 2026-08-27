import { Song } from "./song";

export interface RoomMember {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  joined_at: string;
}

export interface MusicRoom {
  id: string;
  code: string;
  room_code?: string;
  name: string;
  host_id: string;
  host_name: string;
  is_active: boolean;
  current_song?: Song | null;
  position?: number;
  is_playing?: boolean;
  queue?: Song[];
  created_at: string;
  members?: RoomMember[];
}
