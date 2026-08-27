import { Song } from "./song";

export interface HistoryItem {
  id: string;
  song: Song;
  played_at: string;
  date_group: "Today" | "Yesterday" | "Earlier this week" | "Older";
}
