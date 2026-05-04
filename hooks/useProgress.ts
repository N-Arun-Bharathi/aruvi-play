import { useEffect, useState } from "react";
import { tryGetPlayer } from "../services/trackPlayer";
import { usePlayerStore } from "../store/playerStore";

export function useProgress() {
  const ready = usePlayerStore((s) => s.ready);
  const [state, setState] = useState({ position: 0, duration: 0 });

  useEffect(() => {
    if (!ready) return;
    const player = tryGetPlayer();
    if (!player) return;

    const sub = player.addListener("playbackStatusUpdate", (status) => {
      setState({ position: status.currentTime, duration: status.duration });
    });
    return () => sub.remove();
  }, [ready]);

  return state;
}
