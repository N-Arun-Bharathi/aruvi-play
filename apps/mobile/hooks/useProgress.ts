import { useProgress as useRNTPProgress } from "react-native-track-player";
import { usePlayerStore } from "../store/playerStore";

export function useProgress(updateInterval = 250) {
  const current = usePlayerStore((s) => s.current);
  const rntpProgress = useRNTPProgress(updateInterval);

  const rawPosition = rntpProgress.position || 0;
  const rawDuration = rntpProgress.duration || 0;

  const position = Math.max(0, rawPosition);
  const duration = rawDuration > 0 ? rawDuration : (current?.duration || 0);

  return {
    position,
    duration,
    buffered: rntpProgress.buffered || 0,
  };
}
