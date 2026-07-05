import { create } from "zustand";
import { Song, RepeatMode } from "../types/song";
import {
  clearLockScreen,
  setupPlayer,
  tryGetPlayer,
} from "../services/trackPlayer";
import { QueueManager } from "../services/queueManager";

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
  smartMode: boolean;
  currentContext: any | null;

  init: () => Promise<void>;
  playSong: (song: Song, contextQueue?: Song[]) => Promise<void>;
  playSmart: (song: Song) => Promise<void>;
  setSmartMode: (enabled: boolean) => void;
  addToQueue: (song: Song) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seekTo: (s: number) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  cycleRepeat: () => Promise<void>;
  setQueue: (queue: Song[]) => void;
  playNextImmediately: (song: Song) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ready: false,
  current: null,
  queue: [],
  index: -1,
  isPlaying: false,
  shuffle: false,
  repeat: "off",
  fetchingRelated: false,
  resolving: false,
  smartMode: false,
  currentContext: null,

  setQueue: (queue: Song[]) => {
    QueueManager.getInstance().syncQueue(queue);
  },

  setSmartMode: (enabled: boolean) => set({ smartMode: enabled }),

  init: async () => {
    if (get().ready) return;
    await setupPlayer();
    
    // Set up QueueManager singleton
    const manager = QueueManager.getInstance();
    await manager.init();

    // Setup remote lock-screen events directly inside the setup process
    const player = tryGetPlayer();
    if (player) {
      // @ts-ignore - native bridge extension
      player.addListener("remoteAction", ({ action }: { action: string }) => {
        if (action === "next") manager.playNext();
        if (action === "previous") manager.playPrevious();
        if (action === "like") {
          const current = manager.queue[manager.index];
          if (current) {
            const { useLibraryStore } = require("./likedStore");
            useLibraryStore.getState().toggleLike(current);
          }
        }
      });
    }

    set({ ready: true });
  },

  playSong: async (song, contextQueue) => {
    await get().init();
    await QueueManager.getInstance().playSong(song, contextQueue);
  },

  playSmart: async (song) => {
    await get().init();
    const { fetchSmartSongs } = require("../services/smartQueue");
    const { songs, context } = await fetchSmartSongs(song);
    set({ currentContext: context });
    await QueueManager.getInstance().playSong(song, [song, ...songs]);
  },

  addToQueue: async (song) => {
    await get().init();
    QueueManager.getInstance().addToQueue(song);
  },

  playNextImmediately: (song) => {
    QueueManager.getInstance().playNextImmediately(song);
  },

  togglePlay: async () => {
    QueueManager.getInstance().togglePlay();
  },

  next: async () => {
    await QueueManager.getInstance().playNext();
  },

  prev: async () => {
    await QueueManager.getInstance().playPrevious();
  },

  seekTo: async (s) => {
    QueueManager.getInstance().seekTo(s);
  },

  toggleShuffle: async () => {
    const { shuffle } = get();
    const manager = QueueManager.getInstance();
    
    if (!shuffle) {
      if (manager.queue.length === 0) return;
      const current = manager.queue[manager.index];
      const rest = manager.queue.filter((_, i) => i !== manager.index);
      const shuffled = [current, ...shuffleArray(rest)];
      manager.syncQueue(shuffled);
      set({ shuffle: true });
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
}));
