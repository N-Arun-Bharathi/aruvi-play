import { useEffect, useState } from "react";
import TrackPlayer from "react-native-track-player";
import { usePlayerStore } from "../store/playerStore";

export function useProgress() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const current = usePlayerStore((s) => s.current);
  const [state, setState] = useState({ position: 0, duration: 0 });

  useEffect(() => {
    let mounted = true;
    let timerId: any = null;

    const tick = async () => {
      try {
        const progress = await TrackPlayer.getProgress();
        if (mounted) {
          setState({
            position: progress.position || 0,
            duration: progress.duration || 0,
          });
        }
      } catch (e) {
        // Ignore initialization or unbound service errors
      }
      
      if (mounted) {
        timerId = setTimeout(tick, 250);
      }
    };

    tick();

    return () => {
      mounted = false;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [isPlaying, current]);

  return state;
}
