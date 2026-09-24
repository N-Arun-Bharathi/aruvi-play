import { create } from "zustand";
import {
  Song,
  RepeatMode,
  getRelatedSongs,
  searchSongs,
  isAlternateVersion,
  extractPrimaryArtist,
  EqualizerSettings,
  EqualizerPresetName,
  EqualizerBands,
  EQUALIZER_PRESETS,
  SleepTimerState,
  SleepTimerOption,
  PlaybackSettings,
} from "@aruvi/shared";
import { useSettingsStore } from "./settingsStore";
import { useHistoryStore } from "./historyStore";
import { useInsightsStore } from "./insightsStore";
import { useToastStore } from "./toastStore";

interface PlayerState {
  queue: Song[];
  originalQueue: Song[];
  currentIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isExpanded: boolean;

  // Spotify-grade Equalizer
  equalizer: EqualizerSettings;
  setEqualizerEnabled: (enabled: boolean) => void;
  setEqualizerPreset: (preset: EqualizerPresetName) => void;
  setEqualizerBand: (band: keyof EqualizerBands, value: number) => void;
  setEqualizerPreamp: (gain: number) => void;

  // Spotify-grade Sleep Timer
  sleepTimer: SleepTimerState;
  setSleepTimer: (option: SleepTimerOption) => void;
  cancelSleepTimer: () => void;

  // Spotify-grade Playback Settings (Crossfade, Speed, Normalization, Smart Shuffle)
  playbackSettings: PlaybackSettings;
  setPlaybackSpeed: (speed: number) => void;
  setCrossfadeSeconds: (sec: number) => void;
  toggleAudioNormalization: () => void;
  toggleSmartShuffle: () => void;

  // Core Actions
  hydrate: () => void;
  playSong: (song: Song, newQueue?: Song[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleExpanded: () => void;
}

const PLAYER_STORAGE_KEY = "aruvi_saved_player_state_v2";
const EQUALIZER_STORAGE_KEY = "aruvi_equalizer_settings_v2";
const PLAYBACK_SETTINGS_KEY = "aruvi_playback_settings_v2";

const DEFAULT_EQUALIZER: EqualizerSettings = {
  enabled: true,
  preset: "flat",
  bands: { ...EQUALIZER_PRESETS.flat.bands },
  preamp: 0,
};

const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  crossfadeSeconds: 3,
  playbackSpeed: 1.0,
  audioNormalization: true,
  smartShuffle: false,
  gapless: true,
};

const DEFAULT_SLEEP_TIMER: SleepTimerState = {
  active: false,
  durationMinutes: "end_of_track",
  remainingSeconds: 0,
  endAtTimestamp: null,
};

// HTML5 Audio Singleton
const audio = new Audio();
audio.preload = "auto";

// Web Audio API DSP Engine
class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private preampNode: GainNode | null = null;
  private filters: {
    f60: BiquadFilterNode;
    f230: BiquadFilterNode;
    f910: BiquadFilterNode;
    f3600: BiquadFilterNode;
    f14000: BiquadFilterNode;
  } | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized = false;

  public init(audioEl: HTMLAudioElement) {
    if (this.isInitialized || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.source = this.ctx.createMediaElementSource(audioEl);

      this.preampNode = this.ctx.createGain();

      // 60Hz Low Shelf
      const f60 = this.ctx.createBiquadFilter();
      f60.type = "lowshelf";
      f60.frequency.value = 60;

      // 230Hz Peaking
      const f230 = this.ctx.createBiquadFilter();
      f230.type = "peaking";
      f230.frequency.value = 230;
      f230.Q.value = 1.0;

      // 910Hz Peaking
      const f910 = this.ctx.createBiquadFilter();
      f910.type = "peaking";
      f910.frequency.value = 910;
      f910.Q.value = 1.0;

      // 3.6kHz Peaking
      const f3600 = this.ctx.createBiquadFilter();
      f3600.type = "peaking";
      f3600.frequency.value = 3600;
      f3600.Q.value = 1.0;

      // 14kHz High Shelf
      const f14000 = this.ctx.createBiquadFilter();
      f14000.type = "highshelf";
      f14000.frequency.value = 14000;

      this.masterGain = this.ctx.createGain();

      // Connect graph: source -> preamp -> f60 -> f230 -> f910 -> f3600 -> f14000 -> masterGain -> destination
      this.source.connect(this.preampNode);
      this.preampNode.connect(f60);
      f60.connect(f230);
      f230.connect(f910);
      f910.connect(f3600);
      f3600.connect(f14000);
      f14000.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.filters = { f60, f230, f910, f3600, f14000 };
      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API could not be attached directly to element:", e);
    }
  }

  public ensureRunning() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public applyEqualizer(settings: EqualizerSettings) {
    if (!this.filters || !this.preampNode) return;
    if (!settings.enabled) {
      this.preampNode.gain.value = 1;
      this.filters.f60.gain.value = 0;
      this.filters.f230.gain.value = 0;
      this.filters.f910.gain.value = 0;
      this.filters.f3600.gain.value = 0;
      this.filters.f14000.gain.value = 0;
      return;
    }

    const preampLinear = Math.pow(10, (settings.preamp || 0) / 20);
    this.preampNode.gain.value = preampLinear;

    this.filters.f60.gain.value = settings.bands.band60 || 0;
    this.filters.f230.gain.value = settings.bands.band230 || 0;
    this.filters.f910.gain.value = settings.bands.band910 || 0;
    this.filters.f3600.gain.value = settings.bands.band3600 || 0;
    this.filters.f14000.gain.value = settings.bands.band14000 || 0;
  }
}

const audioDsp = new WebAudioEngine();

// MediaSession Metadata Helper
function updateMediaSessionMetadata(song: Song | null) {
  if (!("mediaSession" in navigator) || !song) return;

  try {
    const artworkList: MediaImage[] = song.artwork
      ? [
          { src: song.artwork, sizes: "96x96", type: "image/jpeg" },
          { src: song.artwork, sizes: "128x128", type: "image/jpeg" },
          { src: song.artwork, sizes: "256x256", type: "image/jpeg" },
          { src: song.artwork, sizes: "512x512", type: "image/jpeg" },
        ]
      : [{ src: "/aruvi-play.png", sizes: "512x512", type: "image/png" }];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.album || "Aruvi Play",
      artwork: artworkList,
    });
  } catch (e) {
    console.warn("Failed to set MediaSession metadata:", e);
  }
}

function updateMediaSessionPositionState(position: number, duration: number) {
  if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setPositionState !== "function") return;
  if (!duration || duration <= 0 || isNaN(duration) || isNaN(position)) return;

  try {
    navigator.mediaSession.setPositionState({
      duration: Math.max(duration, 0),
      playbackRate: audio.playbackRate || 1,
      position: Math.min(Math.max(position, 0), duration),
    });
  } catch (e) {}
}

let sleepTimerInterval: any = null;
let currentTrackPlayStartTime = 0;
let accumulatedTrackPlayDuration = 0;

export const usePlayerStore = create<PlayerState>((set, get) => {
  const setupMediaSessionHandlers = () => {
    if (!("mediaSession" in navigator)) return;

    const actionMap: Array<[MediaSessionAction, (details: any) => void]> = [
      ["play", () => get().resume()],
      ["pause", () => get().pause()],
      ["previoustrack", () => get().prev()],
      ["nexttrack", () => get().next()],
      [
        "seekto",
        (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            get().seekTo(details.seekTime);
          }
        },
      ],
      [
        "seekbackward",
        (details) => {
          const skip = details.seekOffset || 10;
          get().seekTo(Math.max((audio.currentTime || 0) - skip, 0));
        },
      ],
      [
        "seekforward",
        (details) => {
          const skip = details.seekOffset || 10;
          get().seekTo(Math.min((audio.currentTime || 0) + skip, audio.duration || 0));
        },
      ],
      ["stop", () => get().pause()],
    ];

    for (const [action, handler] of actionMap) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {}
    }
  };

  setupMediaSessionHandlers();

  // Listeners for HTML5 Audio element
  let lastPersistTime = 0;
  audio.ontimeupdate = () => {
    const curTime = audio.currentTime || 0;
    const dur = audio.duration || 0;

    set({
      position: curTime,
      duration: dur,
    });

    updateMediaSessionPositionState(curTime, dur);

    const now = Date.now();
    if (now - lastPersistTime > 4000) {
      lastPersistTime = now;
      try {
        localStorage.setItem(
          PLAYER_STORAGE_KEY,
          JSON.stringify({
            currentSong: get().currentSong,
            queue: get().queue,
            originalQueue: get().originalQueue,
            currentIndex: get().currentIndex,
            position: curTime,
            duration: dur,
            volume: get().volume,
            repeatMode: get().repeatMode,
            isShuffle: get().isShuffle,
          })
        );
      } catch (e) {}
    }
  };

  audio.onended = () => {
    const { repeatMode, next, currentSong, sleepTimer } = get();

    // Commit listened time to analytics
    if (currentSong && currentTrackPlayStartTime > 0) {
      const sessionSeconds = (Date.now() - currentTrackPlayStartTime) / 1000;
      accumulatedTrackPlayDuration += sessionSeconds;
      useInsightsStore.getState().recordPlay(currentSong, accumulatedTrackPlayDuration);
      accumulatedTrackPlayDuration = 0;
      currentTrackPlayStartTime = 0;
    }

    // Check sleep timer 'end_of_track'
    if (sleepTimer.active && sleepTimer.durationMinutes === "end_of_track") {
      audio.pause();
      set({
        isPlaying: false,
        sleepTimer: { ...DEFAULT_SLEEP_TIMER },
      });
      useToastStore.getState().show("Sleep timer: End of track reached. Playback paused.", "info");
      return;
    }

    if (repeatMode === "one" && currentSong) {
      audio.currentTime = 0;
      audio.play().catch(console.error);
    } else {
      next();
    }
  };

  audio.onplay = () => {
    set({ isPlaying: true });
    currentTrackPlayStartTime = Date.now();
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }
  };

  audio.onpause = () => {
    set({ isPlaying: false });
    if (currentTrackPlayStartTime > 0) {
      accumulatedTrackPlayDuration += (Date.now() - currentTrackPlayStartTime) / 1000;
      currentTrackPlayStartTime = 0;
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  };

  audio.onerror = (e) => {
    console.warn("Audio load error on source URL, auto-advancing to next song:", e);
    set({ isPlaying: false });
    const { next } = get();
    setTimeout(() => next(), 500);
  };

  const loadAndPlayTrack = (song: Song) => {
    // Record to history store
    useHistoryStore.getState().addSongToHistory(song);

    // Ensure Web Audio Engine graph is initialized on user click
    audioDsp.init(audio);
    audioDsp.ensureRunning();
    audioDsp.applyEqualizer(get().equalizer);

    // Crossfade / Smooth volume ramp
    const targetVolume = get().volume;
    const crossfade = get().playbackSettings.crossfadeSeconds;

    audio.src = song.url;
    audio.playbackRate = get().playbackSettings.playbackSpeed || 1.0;

    if (crossfade > 0) {
      audio.volume = 0;
      audio
        .play()
        .then(() => {
          set({ isPlaying: true });
          updateMediaSessionMetadata(song);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }

          // Ramp volume up over 400ms
          const fadeSteps = 10;
          const stepTime = 40;
          let currentStep = 0;
          const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.min(targetVolume, (currentStep / fadeSteps) * targetVolume);
            if (currentStep >= fadeSteps) {
              clearInterval(fadeInterval);
              audio.volume = targetVolume;
            }
          }, stepTime);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          set({ isPlaying: false });
        });
    } else {
      audio.volume = targetVolume;
      audio
        .play()
        .then(() => {
          set({ isPlaying: true });
          updateMediaSessionMetadata(song);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          set({ isPlaying: false });
        });
    }
  };

  const appendRelatedIfNeeded = async (song: Song) => {
    const { queue, currentIndex } = get();
    if (queue.length - currentIndex <= 3 && song.source === "online") {
      try {
        const preferredLang = (
          useSettingsStore.getState().preferredLanguage ||
          song.language ||
          "Tamil"
        ).toLowerCase();
        let related: Song[] = [];
        try {
          related = await getRelatedSongs(song.id);
        } catch (e) {}

        const currentQueue = get().queue;

        let newItems = (related || []).filter(
          (r) => !currentQueue.some((q) => q.id === r.id || isAlternateVersion(r, q))
        );

        const distinctNewItems: Song[] = [];
        for (const item of newItems) {
          if (!distinctNewItems.some((d) => isAlternateVersion(item, d))) {
            distinctNewItems.push(item);
          }
        }
        newItems = distinctNewItems;

        const artist = extractPrimaryArtist(song);
        if (artist) {
          const langHits = await searchSongs(`${artist} ${preferredLang} hits`);
          for (const hit of langHits) {
            if (
              !currentQueue.some((q) => q.id === hit.id || isAlternateVersion(hit, q)) &&
              !newItems.some((d) => isAlternateVersion(hit, d))
            ) {
              newItems.push(hit);
            }
          }

          if (newItems.length < 5) {
            const generalHits = await searchSongs(`${artist} hits`);
            for (const hit of generalHits) {
              if (
                !currentQueue.some((q) => q.id === hit.id || isAlternateVersion(hit, q)) &&
                !newItems.some((d) => isAlternateVersion(hit, d))
              ) {
                newItems.push(hit);
              }
            }
          }
        }

        newItems.sort((a, b) => {
          const aMatch = (a.language || "").toLowerCase() === preferredLang ? 1 : 0;
          const bMatch = (b.language || "").toLowerCase() === preferredLang ? 1 : 0;
          return bMatch - aMatch;
        });

        if (newItems.length > 0) {
          const updatedQ = [...currentQueue, ...newItems];
          set({ queue: updatedQ });
        }
      } catch (err) {
        console.error("Failed to append related songs:", err);
      }
    }
  };

  return {
    queue: [],
    originalQueue: [],
    currentIndex: -1,
    currentSong: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    repeatMode: "off",
    isShuffle: false,
    isExpanded: false,

    equalizer: DEFAULT_EQUALIZER,
    sleepTimer: DEFAULT_SLEEP_TIMER,
    playbackSettings: DEFAULT_PLAYBACK_SETTINGS,

    // Hydration
    hydrate: () => {
      try {
        // Hydrate player state
        const rawPlayer = localStorage.getItem(PLAYER_STORAGE_KEY);
        if (rawPlayer) {
          const saved = JSON.parse(rawPlayer);
          if (saved && saved.currentSong) {
            const song = saved.currentSong;
            if (song.url) {
              audio.src = song.url;
              if (saved.position > 0) audio.currentTime = saved.position;
            }
            if (saved.volume !== undefined) audio.volume = saved.volume;

            set({
              currentSong: song,
              queue: saved.queue && saved.queue.length > 0 ? saved.queue : [song],
              originalQueue: saved.originalQueue && saved.originalQueue.length > 0 ? saved.originalQueue : [song],
              currentIndex: saved.currentIndex >= 0 ? saved.currentIndex : 0,
              position: saved.position || 0,
              duration: saved.duration || song.duration || 0,
              volume: saved.volume !== undefined ? saved.volume : 0.8,
              repeatMode: saved.repeatMode || "off",
              isShuffle: saved.isShuffle || false,
              isPlaying: false,
            });

            updateMediaSessionMetadata(song);
          }
        }

        // Hydrate Equalizer
        const rawEq = localStorage.getItem(EQUALIZER_STORAGE_KEY);
        if (rawEq) {
          const eq: EqualizerSettings = JSON.parse(rawEq);
          set({ equalizer: eq });
        }

        // Hydrate Playback Settings
        const rawPb = localStorage.getItem(PLAYBACK_SETTINGS_KEY);
        if (rawPb) {
          const pb: PlaybackSettings = JSON.parse(rawPb);
          set({ playbackSettings: pb });
          if (pb.playbackSpeed) audio.playbackRate = pb.playbackSpeed;
        }

        // Load Listening Insights
        useInsightsStore.getState().loadStats();
      } catch (e) {
        console.warn("Failed to hydrate player store:", e);
      }
    },

    // Equalizer controls
    setEqualizerEnabled: (enabled: boolean) => {
      const updated: EqualizerSettings = { ...get().equalizer, enabled };
      set({ equalizer: updated });
      audioDsp.applyEqualizer(updated);
      try {
        localStorage.setItem(EQUALIZER_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
    },

    setEqualizerPreset: (preset: EqualizerPresetName) => {
      const presetConfig = EQUALIZER_PRESETS[preset] || EQUALIZER_PRESETS.flat;
      const updated: EqualizerSettings = {
        ...get().equalizer,
        preset,
        bands: { ...presetConfig.bands },
        preamp: presetConfig.preamp,
      };
      set({ equalizer: updated });
      audioDsp.applyEqualizer(updated);
      try {
        localStorage.setItem(EQUALIZER_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
    },

    setEqualizerBand: (band: keyof EqualizerBands, value: number) => {
      const updatedBands = { ...get().equalizer.bands, [band]: value };
      const updated: EqualizerSettings = {
        ...get().equalizer,
        preset: "custom",
        bands: updatedBands,
      };
      set({ equalizer: updated });
      audioDsp.applyEqualizer(updated);
      try {
        localStorage.setItem(EQUALIZER_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
    },

    setEqualizerPreamp: (gain: number) => {
      const updated: EqualizerSettings = {
        ...get().equalizer,
        preamp: gain,
      };
      set({ equalizer: updated });
      audioDsp.applyEqualizer(updated);
      try {
        localStorage.setItem(EQUALIZER_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
    },

    // Sleep Timer
    setSleepTimer: (option: SleepTimerOption) => {
      if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
      }

      if (option === "off") {
        set({ sleepTimer: { ...DEFAULT_SLEEP_TIMER } });
        useToastStore.getState().show("Sleep timer turned off", "info");
        return;
      }

      if (option === "end_of_track") {
        set({
          sleepTimer: {
            active: true,
            durationMinutes: "end_of_track",
            remainingSeconds: 0,
            endAtTimestamp: null,
          },
        });
        useToastStore.getState().show("Sleep timer set to end of current track 🌙", "success");
        return;
      }

      const minutes = parseInt(option, 10);
      const totalSeconds = minutes * 60;
      const endAtTimestamp = Date.now() + totalSeconds * 1000;

      set({
        sleepTimer: {
          active: true,
          durationMinutes: minutes,
          remainingSeconds: totalSeconds,
          endAtTimestamp,
        },
      });

      useToastStore.getState().show(`Sleep timer set for ${minutes} minutes 🌙`, "success");

      sleepTimerInterval = setInterval(() => {
        const { sleepTimer, volume } = get();
        if (!sleepTimer.active || typeof sleepTimer.durationMinutes !== "number") {
          clearInterval(sleepTimerInterval);
          return;
        }

        const rem = sleepTimer.remainingSeconds - 1;

        // Gentle volume fade-out in final 10 seconds
        if (rem <= 10 && rem > 0) {
          audio.volume = Math.max(0, (rem / 10) * volume);
        }

        if (rem <= 0) {
          clearInterval(sleepTimerInterval);
          sleepTimerInterval = null;
          audio.pause();
          audio.volume = volume; // Restore baseline volume
          set({
            isPlaying: false,
            sleepTimer: { ...DEFAULT_SLEEP_TIMER },
          });
          useToastStore.getState().show("Sleep timer finished. Playback paused.", "info");
        } else {
          set({
            sleepTimer: { ...sleepTimer, remainingSeconds: rem },
          });
        }
      }, 1000);
    },

    cancelSleepTimer: () => {
      if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
      }
      set({ sleepTimer: { ...DEFAULT_SLEEP_TIMER } });
      useToastStore.getState().show("Sleep timer cancelled", "info");
    },

    // Playback Settings
    setPlaybackSpeed: (speed: number) => {
      audio.playbackRate = speed;
      const updated = { ...get().playbackSettings, playbackSpeed: speed };
      set({ playbackSettings: updated });
      try {
        localStorage.setItem(PLAYBACK_SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {}
    },

    setCrossfadeSeconds: (sec: number) => {
      const updated = { ...get().playbackSettings, crossfadeSeconds: sec };
      set({ playbackSettings: updated });
      try {
        localStorage.setItem(PLAYBACK_SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {}
    },

    toggleAudioNormalization: () => {
      const updated = {
        ...get().playbackSettings,
        audioNormalization: !get().playbackSettings.audioNormalization,
      };
      set({ playbackSettings: updated });
      try {
        localStorage.setItem(PLAYBACK_SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {}
      useToastStore.getState().show(
        `Audio Normalization ${updated.audioNormalization ? "Enabled" : "Disabled"}`,
        "info"
      );
    },

    toggleSmartShuffle: () => {
      const updated = {
        ...get().playbackSettings,
        smartShuffle: !get().playbackSettings.smartShuffle,
      };
      set({ playbackSettings: updated });
      try {
        localStorage.setItem(PLAYBACK_SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {}
      useToastStore.getState().show(
        `Smart Shuffle ${updated.smartShuffle ? "Activated ✨" : "Deactivated"}`,
        "success"
      );
    },

    // Playback Actions
    playSong: (song: Song, newQueue?: Song[]) => {
      // Record any prior unfinished song
      const { currentSong: prevSong } = get();
      if (prevSong && currentTrackPlayStartTime > 0) {
        const sessionSeconds = (Date.now() - currentTrackPlayStartTime) / 1000;
        accumulatedTrackPlayDuration += sessionSeconds;
        useInsightsStore.getState().recordPlay(prevSong, accumulatedTrackPlayDuration);
        accumulatedTrackPlayDuration = 0;
        currentTrackPlayStartTime = 0;
      }

      const rawQ = newQueue && newQueue.length > 0 ? newQueue : [song];
      const clickedIdx = rawQ.findIndex((s) => s.id === song.id);
      const effectiveIdx = clickedIdx >= 0 ? clickedIdx : 0;
      const targetSong = rawQ[effectiveIdx] || song;

      let q: Song[];
      let targetIndex = 0;

      if (newQueue && newQueue.length > 1) {
        // Explicit queue passed (e.g. Daily Mix, Playlist, Liked Songs, Search) -> Preserve all items
        const seen = new Set<string>();
        q = rawQ.filter((s) => {
          if (!s || !s.id) return false;
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        targetIndex = q.findIndex((s) => s.id === targetSong.id);
        if (targetIndex < 0) targetIndex = 0;
      } else {
        // Single track clicked -> create filtered queue with no duplicate stems
        q = rawQ.filter((s, idx) => {
          if (idx === clickedIdx) return true;
          if (isAlternateVersion(s, targetSong)) return false;
          return true;
        });
        targetIndex = 0;
      }

      set({
        queue: q,
        originalQueue: q,
        currentIndex: targetIndex,
        currentSong: targetSong,
      });

      loadAndPlayTrack(targetSong);
      appendRelatedIfNeeded(targetSong);
    },

    togglePlay: () => {
      const { isPlaying, currentSong } = get();
      if (!currentSong) return;
      audioDsp.init(audio);
      audioDsp.ensureRunning();
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.error);
      }
    },

    pause: () => audio.pause(),
    resume: () => {
      audioDsp.init(audio);
      audioDsp.ensureRunning();
      audio.play().catch(console.error);
    },

    next: () => {
      const { queue, currentIndex, repeatMode, currentSong } = get();
      if (queue.length === 0) return;

      if (currentSong && currentTrackPlayStartTime > 0) {
        const sessionSeconds = (Date.now() - currentTrackPlayStartTime) / 1000;
        accumulatedTrackPlayDuration += sessionSeconds;
        useInsightsStore.getState().recordPlay(currentSong, accumulatedTrackPlayDuration);
        accumulatedTrackPlayDuration = 0;
        currentTrackPlayStartTime = 0;
      }

      let nextIndex = currentIndex + 1;

      while (
        nextIndex < queue.length &&
        currentSong &&
        isAlternateVersion(queue[nextIndex], currentSong)
      ) {
        nextIndex++;
      }

      if (nextIndex >= queue.length) {
        if (repeatMode === "all") {
          nextIndex = 0;
        } else {
          audio.pause();
          set({ isPlaying: false });
          return;
        }
      }

      const nextSong = queue[nextIndex];
      set({ currentIndex: nextIndex, currentSong: nextSong });
      loadAndPlayTrack(nextSong);
      appendRelatedIfNeeded(nextSong);
    },

    prev: () => {
      const { queue, currentIndex, position, currentSong } = get();
      if (queue.length === 0) return;

      if (position > 3) {
        audio.currentTime = 0;
        return;
      }

      if (currentSong && currentTrackPlayStartTime > 0) {
        const sessionSeconds = (Date.now() - currentTrackPlayStartTime) / 1000;
        accumulatedTrackPlayDuration += sessionSeconds;
        useInsightsStore.getState().recordPlay(currentSong, accumulatedTrackPlayDuration);
        accumulatedTrackPlayDuration = 0;
        currentTrackPlayStartTime = 0;
      }

      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) prevIndex = queue.length - 1;

      const prevSong = queue[prevIndex];
      set({ currentIndex: prevIndex, currentSong: prevSong });
      loadAndPlayTrack(prevSong);
    },

    seekTo: (seconds: number) => {
      audio.currentTime = seconds;
      set({ position: seconds });
    },

    setVolume: (vol: number) => {
      audio.volume = vol;
      set({ volume: vol, isMuted: vol === 0 });
    },

    toggleMute: () => {
      const { isMuted, volume } = get();
      if (isMuted) {
        audio.volume = volume || 0.8;
        set({ isMuted: false });
      } else {
        audio.volume = 0;
        set({ isMuted: true });
      }
    },

    toggleShuffle: () => {
      const { isShuffle, queue, originalQueue, currentSong } = get();
      if (isShuffle) {
        const activeIndex = originalQueue.findIndex((s) => s.id === currentSong?.id);
        const nextIdx = activeIndex >= 0 ? activeIndex : 0;
        set({ isShuffle: false, queue: originalQueue, currentIndex: nextIdx });
      } else {
        const shuffled = [...queue].sort(() => Math.random() - 0.5);
        let newQ: Song[];
        if (currentSong) {
          const filtered = shuffled.filter((s) => s.id !== currentSong.id);
          newQ = [currentSong, ...filtered];
        } else {
          newQ = shuffled;
        }
        set({ isShuffle: true, queue: newQ, currentIndex: 0 });
      }
    },

    cycleRepeat: () => {
      const { repeatMode } = get();
      const nextMode: RepeatMode =
        repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
      set({ repeatMode: nextMode });
    },

    toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  };
});
