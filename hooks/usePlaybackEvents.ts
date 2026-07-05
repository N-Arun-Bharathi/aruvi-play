import { useEffect } from "react";
import { usePlayerStore } from "../store/playerStore";

/**
  * Hook mounted once globally to initialize the player store on app launch.
  * Listeners and queue logic are driven in QueueManager to prevent duplicate event subscriptions.
  */
export function usePlaybackEvents() {
  const init = usePlayerStore((s) => s.init);

  useEffect(() => {
    init().catch((err) => console.error("Error initializing playback store", err));
  }, [init]);
}
