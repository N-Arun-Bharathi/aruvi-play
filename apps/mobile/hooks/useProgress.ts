import { useEffect, useState } from "react";
import TrackPlayer from "react-native-track-player";
import { usePlayerStore } from "../store/playerStore";

export function useProgress() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentId = usePlayerStore((s) => s.current?.id);
  const [state, setState] = useState({ position: 0, duration: 0 });

  useEffect(() => {
    let mounted = true;
    let timerId: any = null;

    const tick = async () => {
      try {
        const progress = await TrackPlayer.getProgress();
        if (mounted) {
          const newPos = Math.round(progress.position || 0);
          const newDur = Math.round(progress.duration || 0);
          setState((prev) => {
            if (prev.position === newPos && prev.duration === newDur) return prev;
            return { position: newPos, duration: newDur };
          });
        }
      } catch (e) {
        // Ignore unbound service errors
      }

      if (mounted && isPlaying) {
        timerId = setTimeout(tick, 500);
      }
    };

    tick();

    return () => {
      mounted = false;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [isPlaying, currentId]);

  return state;
}
