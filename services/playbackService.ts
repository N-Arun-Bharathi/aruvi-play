import TrackPlayer, { Event } from "react-native-track-player";

export async function playbackService() {
  console.log("PlaybackService: Registering remote event listeners...");

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log("PlaybackService: RemotePlay triggered");
    TrackPlayer.play().catch((err) => console.error("PlaybackService: play error:", err));
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log("PlaybackService: RemotePause triggered");
    TrackPlayer.pause().catch((err) => console.error("PlaybackService: pause error:", err));
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log("PlaybackService: RemoteNext triggered, skipping natively to next placeholder");
    TrackPlayer.skipToNext().catch((err) => console.error("PlaybackService: Failed to skipToNext natively:", err));
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log("PlaybackService: RemotePrevious triggered, skipping natively to previous placeholder");
    TrackPlayer.skipToPrevious().catch((err) => console.error("PlaybackService: Failed to skipToPrevious natively:", err));
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log("PlaybackService: RemoteSeek triggered to:", event.position);
    TrackPlayer.seekTo(event.position).catch((err) => console.error("PlaybackService: seekTo error:", err));
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    console.log("PlaybackService: PlaybackQueueEnded triggered");
    try {
      const { QueueManager } = require("./queueManager");
      QueueManager.getInstance().onTrackFinished();
    } catch (e) {
      console.error("PlaybackService: Error on PlaybackQueueEnded handler:", e);
    }
  });
}
