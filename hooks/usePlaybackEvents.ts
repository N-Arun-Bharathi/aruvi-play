import { useEffect } from "react";
import { tryGetPlayer } from "../services/trackPlayer";
import { usePlayerStore } from "../store/playerStore";

export function usePlaybackEvents() {
  const ready = usePlayerStore((s) => s.ready);

  useEffect(() => {
    if (!ready) return;
    const player = tryGetPlayer();
    if (!player) return;

    const sub = player.addListener("playbackStatusUpdate", (status) => {
      const state = usePlayerStore.getState();
      if (status.playing !== state.isPlaying) {
        usePlayerStore.setState({ isPlaying: status.playing });
      }
      if (status.didJustFinish) state.onTrackFinished();
    });

    // @ts-ignore - newly patched event
    const remoteSub = player.addListener("remoteAction", ({ action }) => {
      const state = usePlayerStore.getState();
      if (action === "next") state.next();
      if (action === "previous") state.prev();
    });

    return () => {
      sub.remove();
      remoteSub.remove();
    };
  }, [ready]);
}
