import { create } from "zustand";
import { Song, RepeatMode } from "../types/song";
import {
  clearLockScreen,
  loadAndPlay,
  setupPlayer,
  tryGetPlayer,
} from "../services/trackPlayer";
import { getRelatedSongs } from "../services/saavn";
import { pushRecent, saveLastPlayed } from "../services/storage";

interface PlayerState {
  ready: boolean;
  current: Song | null;
  queue: Song[];
  index: number;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  fetchingRelated: boolean;
  resolving: boolean;


  init: () => Promise<void>;
  playSong: (song: Song, contextQueue?: Song[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seekTo: (s: number) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  cycleRepeat: () => Promise<void>;
  appendRelatedIfNeeded: () => Promise<void>;
  onTrackFinished: () => Promise<void>;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadIndex(queue: Song[], idx: number) {
  const song = queue[idx];
  if (!song) return;

  const { usePlayerStore } = require("./playerStore");
  const store = usePlayerStore.getState();

  let songToPlay = song;

  // If it's a JSON placeholder (no URL), resolve it
  if (!songToPlay.url) {
    store.setResolving(true);
    const { resolveSong } = require("../services/saavn");
    const resolved = await resolveSong(song.title, song.artist);
    store.setResolving(false);

    if (resolved) {
      songToPlay = { ...resolved, id: song.id }; // Keep the unique queue ID
      // Update the queue in place
      const newQueue = [...queue];
      newQueue[idx] = songToPlay;
      store.setQueue(newQueue);
    } else {
      console.error("Failed to resolve song:", song.title);
      return;
    }
  }

  loadAndPlay(songToPlay);
  store.setCurrent(songToPlay);
  pushRecent(songToPlay).catch(() => {});
  saveLastPlayed(songToPlay, 0).catch(() => {});
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ready: false,
  current: null,
  queue: [],
  index: 0,
  isPlaying: false,
  shuffle: false,
  repeat: "off",
  fetchingRelated: false,
  resolving: false,

  setResolving: (val: boolean) => set({ resolving: val }),
  setQueue: (queue: Song[]) => set({ queue }),
  setCurrent: (current: Song) => set({ current }),

  init: async () => {
    if (get().ready) return;
    await setupPlayer();
    set({ ready: true });
  },

  playSong: async (song, contextQueue) => {
    await get().init();
    let queue = contextQueue && contextQueue.length ? contextQueue : [song];
    let idx = queue.findIndex((s) => s.id === song.id);
    if (idx < 0) {
      queue = [song, ...queue];
      idx = 0;
    }
    set({ queue, index: idx, current: queue[idx], isPlaying: true });
    await loadIndex(queue, idx);
    if (queue[idx]?.source === "online") get().appendRelatedIfNeeded();
  },

  togglePlay: async () => {
    const p = tryGetPlayer();
    if (!p) return;
    if (p.playing) {
      p.pause();
      set({ isPlaying: false });
    } else {
      p.play();
      set({ isPlaying: true });
    }
  },

  next: async () => {
    const { queue, index, repeat } = get();
    let nextIdx = index + 1;
    if (nextIdx >= queue.length) {
      if (repeat === "all") nextIdx = 0;
      else return;
    }
    set({ index: nextIdx, current: queue[nextIdx], isPlaying: true });
    await loadIndex(queue, nextIdx);
    if (queue[nextIdx]?.source === "online") get().appendRelatedIfNeeded();
  },

  prev: async () => {
    const p = tryGetPlayer();
    if (p && p.currentTime > 4) {
      await p.seekTo(0);
      return;
    }
    const { queue, index } = get();
    const prevIdx = index - 1;
    if (prevIdx < 0) {
      if (p) await p.seekTo(0);
      return;
    }
    set({ index: prevIdx, current: queue[prevIdx], isPlaying: true });
    await loadIndex(queue, prevIdx);
  },

  seekTo: async (s) => {
    const p = tryGetPlayer();
    if (p) await p.seekTo(s);
  },

  toggleShuffle: async () => {
    const { shuffle, queue, index } = get();
    if (!shuffle) {
      const current = queue[index];
      const rest = queue.filter((_, i) => i !== index);
      const shuffled = [current, ...shuffleArray(rest)];
      set({ shuffle: true, queue: shuffled, index: 0, current: shuffled[0] });
    } else {
      set({ shuffle: false });
    }
  },

  cycleRepeat: async () => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const next = order[(order.indexOf(get().repeat) + 1) % order.length];
    const p = tryGetPlayer();
    if (p) p.loop = next === "one";
    set({ repeat: next });
  },

  appendRelatedIfNeeded: async () => {
    const { queue, index, current, fetchingRelated } = get();
    if (fetchingRelated) return;
    if (!current || current.source !== "online") return;
    
    // Proactively fetch more songs if we're near the end of the current queue (less than 5 ahead)
    const songsAhead = queue.length - 1 - index;
    if (songsAhead >= 5) return;

    set({ fetchingRelated: true });
    try {
      const related = await getRelatedSongs(current.id);
      const existing = new Set(queue.map((s) => s.id));
      const fresh = related.filter((s) => !existing.has(s.id));
      if (fresh.length) {
        set({ queue: [...queue, ...fresh] });
      }
    } finally {
      set({ fetchingRelated: false });
    }
  },

  onTrackFinished: async () => {
    const { repeat, current, queue, index } = get();
    if (repeat === "one") {
      // expo-audio's `loop` handles this natively — but if loop wasn't set,
      // restart manually.
      if (current) loadIndex(queue, index);
      return;
    }
    if (current?.source === "online") {
      await get().appendRelatedIfNeeded();
    }
    const updated = get();
    if (updated.queue.length > updated.index + 1) {
      await get().next();
    } else if (repeat === "all" && updated.queue.length > 0) {
      set({ index: 0, current: updated.queue[0], isPlaying: true });
      loadIndex(updated.queue, 0);
    } else {
      set({ isPlaying: false });
      clearLockScreen();
    }
  },
}));
