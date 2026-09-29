import { create } from "zustand";
import {
  Song,
  RepeatMode,
  getRelatedSongs,
  searchSongs,
  getSongDetails,
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
  crossfadeSeconds: 0,
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

// HTML5 Audio Singleton - Standard Direct Audio Output
const audio = new Audio();
audio.preload = "auto";

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
    console.warn("Audio playback error on source URL:", audio.src, e);
    const { currentSong, isPlaying } = get();
    // Only attempt recovery lookup if playback was actually active
    if (isPlaying && currentSong?.id) {
      getSongDetails(currentSong.id).then((freshSong) => {
        if (freshSong?.url && freshSong.url !== audio.src) {
          audio.src = freshSong.url;
          audio.play().catch((err) => {
            console.error("Audio recovery play failed:", err);
            set({ isPlaying: false });
          });
        } else {
          set({ isPlaying: false });
        }
      }).catch(() => {
        set({ isPlaying: false });
      });
    } else {
      set({ isPlaying: false });
    }
  };

  const loadAndPlayTrack = async (song: Song) => {
    // Record to history store
    useHistoryStore.getState().addSongToHistory(song);

    let streamUrl = song.url;
    if (!streamUrl || streamUrl === "") {
      try {
        const details = await getSongDetails(song.id);
        if (details?.url) {
          streamUrl = details.url;
          song.url = details.url;
        }
      } catch (e) {
        console.warn("Failed to fetch fresh song details:", e);
      }
    }

    if (!streamUrl) {
      console.warn("No audio stream URL available for track:", song.title);
      useToastStore.getState().show(`Audio unavailable for ${song.title}`, "error");
      get().next();
      return;
    }

    const currentVolume = get().isMuted ? 0 : (get().volume ?? 0.8);
    audio.volume = currentVolume;
    audio.playbackRate = get().playbackSettings.playbackSpeed || 1.0;

    if (audio.src !== streamUrl) {
      audio.src = streamUrl;
    }

    try {
      await audio.play();
      set({ isPlaying: true });
      updateMediaSessionMetadata(song);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Audio play error:", err);
        set({ isPlaying: false });
      }
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
        const rawPlayer = localStorage.getItem(PLAYER_STORAGE_KEY);
        if (rawPlayer) {
          const saved = JSON.parse(rawPlayer);
          if (saved && saved.currentSong) {
            const song = saved.currentSong;
            if (saved.volume !== undefined) {
              audio.volume = saved.volume;
            }

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

        const rawEq = localStorage.getItem(EQUALIZER_STORAGE_KEY);
        if (rawEq) {
          const eq: EqualizerSettings = JSON.parse(rawEq);
          set({ equalizer: eq });
        }

        const rawPb = localStorage.getItem(PLAYBACK_SETTINGS_KEY);
        if (rawPb) {
          const pb: PlaybackSettings = JSON.parse(rawPb);
          set({ playbackSettings: pb });
          if (pb.playbackSpeed) audio.playbackRate = pb.playbackSpeed;
        }

        useInsightsStore.getState().loadStats();
      } catch (e) {
        console.warn("Failed to hydrate player store:", e);
      }
    },

    // Equalizer controls
    setEqualizerEnabled: (enabled: boolean) => {
      const updated: EqualizerSettings = { ...get().equalizer, enabled };
      set({ equalizer: updated });
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

        if (rem <= 10 && rem > 0) {
          audio.volume = Math.max(0, (rem / 10) * (volume || 0.8));
        }

        if (rem <= 0) {
          clearInterval(sleepTimerInterval);
          sleepTimerInterval = null;
          audio.pause();
          audio.volume = volume || 0.8;
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
      const { isPlaying, currentSong, position } = get();
      if (!currentSong) return;
      if (isPlaying) {
        audio.pause();
      } else {
        const needsReload = !audio.src || audio.src === "" || (currentSong.url && !audio.src.includes(currentSong.url.split("?")[0]));
        if (needsReload) {
          loadAndPlayTrack(currentSong).then(() => {
            if (position > 0 && Math.abs(audio.currentTime - position) > 2) {
              try { audio.currentTime = position; } catch (e) {}
            }
          });
        } else {
          if (position > 0 && Math.abs(audio.currentTime - position) > 2) {
            try { audio.currentTime = position; } catch (e) {}
          }
          audio.play().then(() => {
            set({ isPlaying: true });
          }).catch((err) => {
            console.warn("Audio play rejected, attempting fresh track load:", err);
            loadAndPlayTrack(currentSong);
          });
        }
      }
    },

    pause: () => {
      audio.pause();
      set({ isPlaying: false });
    },

    resume: () => {
      const { currentSong, position } = get();
      if (!currentSong) return;
      const needsReload = !audio.src || audio.src === "" || (currentSong.url && !audio.src.includes(currentSong.url.split("?")[0]));
      if (needsReload) {
        loadAndPlayTrack(currentSong).then(() => {
          if (position > 0 && Math.abs(audio.currentTime - position) > 2) {
            try { audio.currentTime = position; } catch (e) {}
          }
        });
      } else {
        if (position > 0 && Math.abs(audio.currentTime - position) > 2) {
          try { audio.currentTime = position; } catch (e) {}
        }
        audio.play().then(() => {
          set({ isPlaying: true });
        }).catch((err) => {
          console.error("Audio resume error:", err);
          loadAndPlayTrack(currentSong);
        });
      }
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
      if (isFinite(seconds) && seconds >= 0) {
        audio.currentTime = seconds;
        set({ position: seconds });
      }
    },

    setVolume: (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      audio.volume = clamped;
      set({ volume: clamped, isMuted: clamped === 0 });
    },

    toggleMute: () => {
      const { isMuted, volume } = get();
      if (isMuted) {
        const targetVol = volume > 0 ? volume : 0.8;
        audio.volume = targetVol;
        set({ isMuted: false, volume: targetVol });
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
