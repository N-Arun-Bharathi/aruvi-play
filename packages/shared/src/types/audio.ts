export type EqualizerPresetName =
  | "flat"
  | "bass_boost"
  | "treble_boost"
  | "vocal_clarity"
  | "acoustic"
  | "electronic"
  | "rock"
  | "deep"
  | "custom";

export interface EqualizerBands {
  band60: number; // 60Hz: -12 to +12 dB (Sub Bass)
  band230: number; // 230Hz: -12 to +12 dB (Bass)
  band910: number; // 910Hz: -12 to +12 dB (Midrange)
  band3600: number; // 3.6kHz: -12 to +12 dB (Presence / Treble)
  band14000: number; // 14kHz: -12 to +12 dB (Brilliance / Air)
}

export interface EqualizerSettings {
  enabled: boolean;
  preset: EqualizerPresetName;
  bands: EqualizerBands;
  preamp: number; // -6 to +6 dB
}

export const EQUALIZER_PRESETS: Record<EqualizerPresetName, { name: string; bands: EqualizerBands; preamp: number }> = {
  flat: {
    name: "Flat (Original)",
    bands: { band60: 0, band230: 0, band910: 0, band3600: 0, band14000: 0 },
    preamp: 0,
  },
  bass_boost: {
    name: "Bass Boost",
    bands: { band60: 8, band230: 5, band910: 0, band3600: -1, band14000: -2 },
    preamp: -1,
  },
  treble_boost: {
    name: "Treble Boost",
    bands: { band60: -2, band230: -1, band910: 1, band3600: 6, band14000: 8 },
    preamp: 0,
  },
  vocal_clarity: {
    name: "Vocal Clarity",
    bands: { band60: -3, band230: 0, band910: 6, band3600: 5, band14000: 2 },
    preamp: 1,
  },
  acoustic: {
    name: "Acoustic",
    bands: { band60: 4, band230: 2, band910: 3, band3600: 4, band14000: 3 },
    preamp: 0,
  },
  electronic: {
    name: "Electronic & EDM",
    bands: { band60: 7, band230: 4, band910: -1, band3600: 4, band14000: 6 },
    preamp: -1,
  },
  rock: {
    name: "Rock & Energetic",
    bands: { band60: 6, band230: 3, band910: -2, band3600: 4, band14000: 5 },
    preamp: 0,
  },
  deep: {
    name: "Deep Atmosphere",
    bands: { band60: 9, band230: 6, band910: -3, band3600: -2, band14000: -4 },
    preamp: -2,
  },
  custom: {
    name: "Custom",
    bands: { band60: 0, band230: 0, band910: 0, band3600: 0, band14000: 0 },
    preamp: 0,
  },
};

export type SleepTimerOption = "off" | "5" | "15" | "30" | "45" | "60" | "end_of_track";

export interface SleepTimerState {
  active: boolean;
  durationMinutes: number | "end_of_track";
  remainingSeconds: number;
  endAtTimestamp: number | null;
}

export interface PlaybackSettings {
  crossfadeSeconds: number; // 0 to 12s
  playbackSpeed: number; // 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x
  audioNormalization: boolean;
  smartShuffle: boolean;
  gapless: boolean;
}

export interface ListeningStatItem {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  album?: string;
  language?: string;
  playCount: number;
  totalSecondsPlayed: number;
  lastPlayed: number;
}

export interface ArtistStatItem {
  artist: string;
  playCount: number;
  totalSecondsPlayed: number;
  artwork?: string;
}

export interface MusicPersona {
  title: string;
  tagline: string;
  description: string;
  icon: string;
  gradient: string;
}

export interface UserListeningStats {
  totalListeningSeconds: number;
  totalPlays: number;
  topSongs: ListeningStatItem[];
  topArtists: ArtistStatItem[];
  streakDays: number;
  lastActiveDate: string;
  musicPersona: MusicPersona;
}
