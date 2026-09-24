import { create } from "zustand";
import {
  Song,
  UserListeningStats,
  ListeningStatItem,
  ArtistStatItem,
  MusicPersona,
  extractPrimaryArtist,
} from "@aruvi/shared";

const INSIGHTS_STORAGE_KEY = "aruvi_listening_insights_v2";

const PERSONA_CONFIGS: Record<string, MusicPersona> = {
  night_owl: {
    title: "Night Owl Explorer",
    tagline: "Late night sonic traveler",
    description: "You thrive when the stars are out, immersing yourself in ambient melodies and midnight beats.",
    icon: "🌙",
    gradient: "from-indigo-600 via-sky-600 to-blue-500",
  },
  devoted_fan: {
    title: "Devoted Superfan",
    tagline: "Loyal to the core",
    description: "When you find an artist you love, you put their discography on repeat and know every harmony.",
    icon: "🎧",
    gradient: "from-sky-500 via-blue-600 to-cyan-400",
  },
  melody_alchemist: {
    title: "Melody Alchemist",
    tagline: "Craver of deep emotional compositions",
    description: "You gravitate towards rich instrumentation, acoustic resonance, and soulful cinematic tracks.",
    icon: "🎼",
    gradient: "from-cyan-500 via-teal-600 to-blue-600",
  },
  energy_master: {
    title: "Energetic Vibe Master",
    tagline: "High-octane tempo enthusiast",
    description: "Your playlists are powerhouses of fast tempos, heavy bass drops, and unmatched dance energy.",
    icon: "⚡",
    gradient: "from-blue-600 via-sky-400 to-teal-400",
  },
  curator_supreme: {
    title: "The Audio Voyager",
    tagline: "Explorer of diverse soundscapes",
    description: "You listen broadly across genres, eras, and languages, curating a vibrant tapestry of music.",
    icon: "✨",
    gradient: "from-sky-400 via-indigo-600 to-blue-700",
  },
};

function computePersona(
  totalSeconds: number,
  topSongs: ListeningStatItem[],
  topArtists: ArtistStatItem[]
): MusicPersona {
  const currentHour = new Date().getHours();

  if (topArtists.length > 0 && topArtists[0].playCount >= 15) {
    return {
      ...PERSONA_CONFIGS.devoted_fan,
      description: `Your devotion to ${topArtists[0].artist} is unmatched with over ${topArtists[0].playCount} tracks played!`,
    };
  }

  if (currentHour >= 22 || currentHour <= 4) {
    return PERSONA_CONFIGS.night_owl;
  }

  if (topSongs.length >= 8) {
    return PERSONA_CONFIGS.curator_supreme;
  }

  if (totalSeconds > 3600 * 5) {
    return PERSONA_CONFIGS.energy_master;
  }

  return PERSONA_CONFIGS.melody_alchemist;
}

interface InsightsState {
  stats: UserListeningStats;
  loadStats: () => void;
  recordPlay: (song: Song, secondsPlayed: number) => void;
  clearStats: () => void;
}

const DEFAULT_STATS: UserListeningStats = {
  totalListeningSeconds: 0,
  totalPlays: 0,
  topSongs: [],
  topArtists: [],
  streakDays: 1,
  lastActiveDate: new Date().toISOString().slice(0, 10),
  musicPersona: PERSONA_CONFIGS.melody_alchemist,
};

export const useInsightsStore = create<InsightsState>((set, get) => ({
  stats: DEFAULT_STATS,

  loadStats: () => {
    try {
      const raw = localStorage.getItem(INSIGHTS_STORAGE_KEY);
      if (raw) {
        const parsed: UserListeningStats = JSON.parse(raw);
        // Refresh persona dynamically
        const persona = computePersona(
          parsed.totalListeningSeconds || 0,
          parsed.topSongs || [],
          parsed.topArtists || []
        );
        set({
          stats: {
            ...parsed,
            musicPersona: persona,
          },
        });
      }
    } catch (e) {
      console.warn("Failed to load listening insights:", e);
    }
  },

  recordPlay: (song: Song, secondsPlayed: number) => {
    if (!song || secondsPlayed < 5) return;

    const currentStats = get().stats;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Calculate streak
    let newStreak = currentStats.streakDays || 1;
    if (currentStats.lastActiveDate) {
      const lastDate = new Date(currentStats.lastActiveDate);
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    // Update Top Songs
    const existingSongs = [...currentStats.topSongs];
    const songIndex = existingSongs.findIndex((s) => s.id === song.id);

    if (songIndex >= 0) {
      existingSongs[songIndex] = {
        ...existingSongs[songIndex],
        playCount: existingSongs[songIndex].playCount + 1,
        totalSecondsPlayed: existingSongs[songIndex].totalSecondsPlayed + Math.round(secondsPlayed),
        lastPlayed: Date.now(),
      };
    } else {
      existingSongs.push({
        id: song.id,
        title: song.title,
        artist: song.artist,
        artwork: song.artwork,
        album: song.album,
        language: song.language,
        playCount: 1,
        totalSecondsPlayed: Math.round(secondsPlayed),
        lastPlayed: Date.now(),
      });
    }

    existingSongs.sort((a, b) => b.playCount - a.playCount || b.totalSecondsPlayed - a.totalSecondsPlayed);
    const topSongs = existingSongs.slice(0, 20);

    // Update Top Artists
    const primaryArtist = extractPrimaryArtist(song) || song.artist || "Unknown Artist";
    const existingArtists = [...currentStats.topArtists];
    const artistIndex = existingArtists.findIndex((a) => a.artist.toLowerCase() === primaryArtist.toLowerCase());

    if (artistIndex >= 0) {
      existingArtists[artistIndex] = {
        ...existingArtists[artistIndex],
        playCount: existingArtists[artistIndex].playCount + 1,
        totalSecondsPlayed: existingArtists[artistIndex].totalSecondsPlayed + Math.round(secondsPlayed),
        artwork: song.artwork || existingArtists[artistIndex].artwork,
      };
    } else {
      existingArtists.push({
        artist: primaryArtist,
        playCount: 1,
        totalSecondsPlayed: Math.round(secondsPlayed),
        artwork: song.artwork,
      });
    }

    existingArtists.sort((a, b) => b.playCount - a.playCount);
    const topArtists = existingArtists.slice(0, 10);

    const totalListeningSeconds = currentStats.totalListeningSeconds + Math.round(secondsPlayed);
    const totalPlays = currentStats.totalPlays + 1;
    const musicPersona = computePersona(totalListeningSeconds, topSongs, topArtists);

    const updatedStats: UserListeningStats = {
      totalListeningSeconds,
      totalPlays,
      topSongs,
      topArtists,
      streakDays: newStreak,
      lastActiveDate: todayStr,
      musicPersona,
    };

    set({ stats: updatedStats });

    try {
      localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(updatedStats));
    } catch (e) {
      console.warn("Failed to persist insights stats:", e);
    }
  },

  clearStats: () => {
    set({ stats: DEFAULT_STATS });
    try {
      localStorage.removeItem(INSIGHTS_STORAGE_KEY);
    } catch (e) {}
  },
}));
