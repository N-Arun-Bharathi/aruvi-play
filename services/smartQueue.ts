import { Song } from "../types/song";
import { searchSongs } from "./saavn";
import { detectSongContext, buildSmartQuery, SongContext } from "../utils/contextDetector";

export async function fetchSmartSongs(song: Song): Promise<{ songs: Song[], context: SongContext }> {
  const context = detectSongContext(song);
  const query = buildSmartQuery(context, song);
  
  try {
    let results = await searchSongs(query);
    
    // If results are too few, try a broader query
    if (results.length < 10) {
      const broader = `${context.type} tamil hits 2024`;
      const extra = await searchSongs(broader);
      results = [...results, ...extra];
    }
    
    // Filter results to ensure vibe matching
    const filtered = results.filter(s => {
      // Don't include the current song
      if (s.id === song.id || (s.title === song.title && s.artist === song.artist)) return false;
      return true;
    });

    // Remove duplicates by Title and Artist (case-insensitive, trimmed)
    const uniqueMap = new Map();
    for (const s of filtered) {
      const key = `${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    }
    const unique = Array.from(uniqueMap.values());

    return {
      songs: unique.slice(0, 30),
      context
    };
  } catch (e) {
    console.error("Smart queue fetch failed", e);
    return { songs: [], context };
  }
}
