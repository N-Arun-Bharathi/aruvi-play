import { Song } from "./song";

export interface QueueState {
  queue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
}
