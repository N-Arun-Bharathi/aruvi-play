import { Song } from "../types/song";
import { searchSongs } from "./saavn";
import { detectSongContext, buildSmartQuery, SongContext } from "../utils/contextDetector";

export async function fetchSmartSongs(song: Song): Promise<{ songs: Song[], context: SongContext }> {
  const context = detectSongContext(song);
  return {
    songs: [],
    context
  };
}
