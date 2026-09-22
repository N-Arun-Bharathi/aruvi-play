import { create } from "zustand";
import {
  Song,
  RepeatMode,
  getRelatedSongs,
  searchSongs,
  isAlternateVersion,
  extractPrimaryArtist,
} from "@aruvi/shared";
import { useSettingsStore } from "./settingsStore";

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

  // Actions
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

const PLAYER_STORAGE_KEY = "aruvi_saved_player_state";

interface SavedPlayerState {
  currentSong: Song | null;
  queue: Song[];
  originalQueue: Song[];
  currentIndex: number;
  position: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
}

// HTML5 Audio Singleton
const audio = new Audio();
audio.preload = "auto";

// Persist helper
function persistPlayerState(state: Partial<SavedPlayerState>) {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    const merged = { ...existing, ...state };
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    // Ignore storage errors
  }
}

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

// MediaSession Position State Helper
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

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Setup media session action handlers for Chrome / OS notification controls
  const setupMediaSessionHandlers = () => {
    if (!("mediaSession" in navigator)) return;

    const actionMap: Array<[MediaSessionAction, (details: any) => void]> = [
      [
        "play",
        () => {
          get().resume();
        },
      ],
      [
        "pause",
        () => {
          get().pause();
        },
      ],
      [
        "previoustrack",
        () => {
          get().prev();
        },
      ],
      [
        "nexttrack",
        () => {
          get().next();
        },
      ],
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
      [
        "stop",
        () => {
          get().pause();
        },
      ],
    ];

    for (const [action, handler] of actionMap) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {
        // Ignored for unsupported actions in older browser engines
      }
    }
  };

  // Initialize Media Session Handlers immediately
  setupMediaSessionHandlers();

  // Listeners for Audio element
  let lastPersistTime = 0;
  audio.ontimeupdate = () => {
    const curTime = audio.currentTime || 0;
    const dur = audio.duration || 0;

    set({
      position: curTime,
      duration: dur,
    });

    updateMediaSessionPositionState(curTime, dur);

    // Periodically throttle saving position to localStorage every 4 seconds
    const now = Date.now();
    if (now - lastPersistTime > 4000) {
      lastPersistTime = now;
      persistPlayerState({ position: curTime, duration: dur });
    }
  };

  audio.onended = () => {
    const { repeatMode, next, currentSong } = get();
    if (repeatMode === "one" && currentSong) {
      audio.currentTime = 0;
      audio.play().catch(console.error);
    } else {
      next();
    }
  };

  audio.onplay = () => {
    set({ isPlaying: true });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }
  };

  audio.onpause = () => {
    set({ isPlaying: false });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
    persistPlayerState({ position: audio.currentTime || 0 });
  };

  audio.onerror = (e) => {
    console.warn("Audio load error on source URL, auto-advancing to next song:", e);
    set({ isPlaying: false });
    const { next } = get();
    setTimeout(() => next(), 500);
  };

  const loadAndPlayTrack = (song: Song) => {
    audio.src = song.url;
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

        // Filter out duplicate IDs AND alternate versions / title variations
        let newItems = (related || []).filter(
          (r) => !currentQueue.some((q) => q.id === r.id || isAlternateVersion(r, q))
        );

        // Deduplicate newItems among themselves
        const distinctNewItems: Song[] = [];
        for (const item of newItems) {
          if (!distinctNewItems.some((d) => isAlternateVersion(item, d))) {
            distinctNewItems.push(item);
          }
        }
        newItems = distinctNewItems;

        const artist = extractPrimaryArtist(song);
        if (artist) {
          // 1. Fetch artist hits specifically in preferred language (e.g. "Anirudh Tamil hits")
          const langHits = await searchSongs(`${artist} ${preferredLang} hits`);
          for (const hit of langHits) {
            if (
              !currentQueue.some((q) => q.id === hit.id || isAlternateVersion(hit, q)) &&
              !newItems.some((d) => isAlternateVersion(hit, d))
            ) {
              newItems.push(hit);
            }
          }

          // 2. If fewer than 5 items, fetch general artist hits
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

        // RANKING ENGINE: 1ST PRIORITY = PREFERRED LANGUAGE!
        newItems.sort((a, b) => {
          const aMatch = (a.language || "").toLowerCase() === preferredLang ? 1 : 0;
          const bMatch = (b.language || "").toLowerCase() === preferredLang ? 1 : 0;
          return bMatch - aMatch;
        });

        if (newItems.length > 0) {
          const updatedQ = [...currentQueue, ...newItems];
          set({ queue: updatedQ });
          persistPlayerState({ queue: updatedQ });
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

    hydrate: () => {
      try {
        const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
        if (!raw) return;
        const saved: SavedPlayerState = JSON.parse(raw);
        if (saved && saved.currentSong) {
          const song = saved.currentSong;
          if (song.url) {
            audio.src = song.url;
            if (saved.position > 0) {
              audio.currentTime = saved.position;
            }
          }
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
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "paused";
          }
        }
      } catch (e) {
        console.warn("Failed to hydrate player state:", e);
      }
    },

    playSong: (song: Song, newQueue?: Song[]) => {
      const rawQ = newQueue && newQueue.length > 0 ? newQueue : [song];
      const clickedIdx = rawQ.findIndex((s) => s.id === song.id);
      const songArtist = extractPrimaryArtist(song).toLowerCase();
      const preferredLang = (
        useSettingsStore.getState().preferredLanguage ||
        song.language ||
        "Tamil"
      ).toLowerCase();

      // Deduplicate queue to remove alternate versions/variations AND unrelated text search hits
      let q = rawQ.filter((s, idx) => {
        if (idx === clickedIdx) return true;
        if (isAlternateVersion(s, song)) return false;
        if (songArtist && songArtist.length > 3) {
          const itemArtist = extractPrimaryArtist(s).toLowerCase();
          if (itemArtist && !itemArtist.includes(songArtist) && !songArtist.includes(itemArtist)) {
            return false;
          }
        }
        return true;
      });

      // Sort UP NEXT queue so songs in the preferred language rank 1ST PRIORITY!
      const played = q[clickedIdx >= 0 ? clickedIdx : 0];
      const remaining = q.filter((_, idx) => idx !== (clickedIdx >= 0 ? clickedIdx : 0));

      remaining.sort((a, b) => {
        const aMatch = (a.language || "").toLowerCase() === preferredLang ? 1 : 0;
        const bMatch = (b.language || "").toLowerCase() === preferredLang ? 1 : 0;
        return bMatch - aMatch;
      });

      q = played ? [played, ...remaining] : remaining;

      set({
        queue: q,
        originalQueue: q,
        currentIndex: 0,
        currentSong: song,
      });

      persistPlayerState({
        currentSong: song,
        queue: q,
        originalQueue: q,
        currentIndex: 0,
        position: 0,
        duration: song.duration || 0,
      });

      loadAndPlayTrack(song);
      appendRelatedIfNeeded(song);
    },

    togglePlay: () => {
      const { isPlaying, currentSong } = get();
      if (!currentSong) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.error);
      }
    },

    pause: () => audio.pause(),
    resume: () => audio.play().catch(console.error),

    next: () => {
      const { queue, currentIndex, repeatMode, currentSong } = get();
      if (queue.length === 0) return;

      let nextIndex = currentIndex + 1;

      // Skip over any remaining alternate versions/title variations of the current song
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

      persistPlayerState({
        currentSong: nextSong,
        currentIndex: nextIndex,
        position: 0,
        duration: nextSong.duration || 0,
      });

      loadAndPlayTrack(nextSong);
      appendRelatedIfNeeded(nextSong);
    },

    prev: () => {
      const { queue, currentIndex, position } = get();
      if (queue.length === 0) return;

      if (position > 3) {
        audio.currentTime = 0;
        return;
      }

      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) prevIndex = queue.length - 1;

      const prevSong = queue[prevIndex];
      set({ currentIndex: prevIndex, currentSong: prevSong });

      persistPlayerState({
        currentSong: prevSong,
        currentIndex: prevIndex,
        position: 0,
        duration: prevSong.duration || 0,
      });

      loadAndPlayTrack(prevSong);
    },

    seekTo: (seconds: number) => {
      audio.currentTime = seconds;
      set({ position: seconds });
      persistPlayerState({ position: seconds });
    },

    setVolume: (vol: number) => {
      audio.volume = vol;
      set({ volume: vol, isMuted: vol === 0 });
      persistPlayerState({ volume: vol });
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
        persistPlayerState({ isShuffle: false, queue: originalQueue, currentIndex: nextIdx });
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
        persistPlayerState({ isShuffle: true, queue: newQ, currentIndex: 0 });
      }
    },

    cycleRepeat: () => {
      const { repeatMode } = get();
      const nextMode: RepeatMode =
        repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
      set({ repeatMode: nextMode });
      persistPlayerState({ repeatMode: nextMode });
    },

    toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  };
});
