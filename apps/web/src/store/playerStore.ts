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

// HTML5 Audio Singleton
const audio = new Audio();
audio.preload = "auto";

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Listeners for Audio element
  audio.ontimeupdate = () => {
    set({
      position: audio.currentTime || 0,
      duration: audio.duration || 0,
    });
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

  audio.onplay = () => set({ isPlaying: true });
  audio.onpause = () => set({ isPlaying: false });
  audio.onerror = (e) => {
    console.warn("Audio load error on source URL, auto-advancing to next song:", e);
    set({ isPlaying: false });
    const { next } = get();
    setTimeout(() => next(), 500);
  };

  const loadAndPlayTrack = (song: Song) => {
    audio.src = song.url;
    audio.play().then(() => {
      set({ isPlaying: true });
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          album: song.album || "Aruvi Play",
          artwork: song.artwork ? [{ src: song.artwork, sizes: '512x512', type: 'image/jpeg' }] : [],
        });
      }
    }).catch((err) => {
      console.error("Audio playback error:", err);
      set({ isPlaying: false });
    });
  };

  const appendRelatedIfNeeded = async (song: Song) => {
    const { queue, currentIndex } = get();
    if (queue.length - currentIndex <= 3 && song.source === "online") {
      try {
        const preferredLang = (useSettingsStore.getState().preferredLanguage || song.language || "Tamil").toLowerCase();
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
          set({ queue: [...currentQueue, ...newItems] });
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

    playSong: (song: Song, newQueue?: Song[]) => {
      const rawQ = newQueue && newQueue.length > 0 ? newQueue : [song];
      const clickedIdx = rawQ.findIndex((s) => s.id === song.id);
      const songArtist = extractPrimaryArtist(song).toLowerCase();
      const preferredLang = (useSettingsStore.getState().preferredLanguage || song.language || "Tamil").toLowerCase();

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
        set({ isShuffle: false, queue: originalQueue, currentIndex: activeIndex >= 0 ? activeIndex : 0 });
      } else {
        const shuffled = [...queue].sort(() => Math.random() - 0.5);
        if (currentSong) {
          const filtered = shuffled.filter((s) => s.id !== currentSong.id);
          set({ isShuffle: true, queue: [currentSong, ...filtered], currentIndex: 0 });
        } else {
          set({ isShuffle: true, queue: shuffled, currentIndex: 0 });
        }
      }
    },

    cycleRepeat: () => {
      const { repeatMode } = get();
      const nextMode: RepeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
      set({ repeatMode: nextMode });
    },

    toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  };
});
