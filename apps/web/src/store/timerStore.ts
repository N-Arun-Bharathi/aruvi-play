import { create } from "zustand";
import { usePlayerStore } from "./playerStore";
import { useToastStore } from "./toastStore";

interface TimerState {
  timeLeft: number | null; // in seconds
  timerActive: boolean;
  setTimer: (minutes: number | null) => void;
  tick: () => void;
}

let tickInterval: any = null;

export const useTimerStore = create<TimerState>((set, get) => ({
  timeLeft: null,
  timerActive: false,

  setTimer: (minutes) => {
    if (tickInterval) clearInterval(tickInterval);

    if (minutes === null) {
      set({ timeLeft: null, timerActive: false });
      useToastStore.getState().show("Sleep timer cancelled");
      return;
    }

    const seconds = minutes * 60;
    set({ timeLeft: seconds, timerActive: true });
    useToastStore.getState().show(`Sleep timer set for ${minutes} minutes`, "success");

    tickInterval = setInterval(() => {
      get().tick();
    }, 1000);
  },

  tick: () => {
    const { timeLeft } = get();
    if (timeLeft === null) return;

    if (timeLeft <= 1) {
      if (tickInterval) clearInterval(tickInterval);
      set({ timeLeft: null, timerActive: false });

      // Stop playback
      const player = usePlayerStore.getState();
      if (player.isPlaying) {
        player.pause();
      }
      useToastStore.getState().show("Sleep timer finished. Playback paused.", "info");
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },
}));
