import TrackPlayer, { Event } from "react-native-track-player";

export async function playbackService() {
  console.log("PlaybackService: Registering remote event listeners...");

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log("PlaybackService: RemotePlay triggered");
    try {
      const { QueueManager } = require("./queueManager");
      const manager = QueueManager.getInstance();
      if (!manager.isPlaying) {
        manager.togglePlay();
      } else {
        TrackPlayer.play().catch((err) => console.error("PlaybackService: play error:", err));
      }
    } catch (e) {
      TrackPlayer.play().catch((err) => console.error("PlaybackService: play fallback error:", err));
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log("PlaybackService: RemotePause triggered");
    try {
      const { QueueManager } = require("./queueManager");
      const manager = QueueManager.getInstance();
      if (manager.isPlaying) {
        manager.togglePlay();
      } else {
        TrackPlayer.pause().catch((err) => console.error("PlaybackService: pause error:", err));
      }
    } catch (e) {
      TrackPlayer.pause().catch((err) => console.error("PlaybackService: pause fallback error:", err));
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log("PlaybackService: RemoteNext triggered -> QueueManager.playNext()");
    try {
      const { QueueManager } = require("./queueManager");
      QueueManager.getInstance().playNext();
    } catch (e) {
      console.error("PlaybackService: Failed to trigger playNext:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log("PlaybackService: RemotePrevious triggered -> QueueManager.playPrevious()");
    try {
      const { QueueManager } = require("./queueManager");
      QueueManager.getInstance().playPrevious();
    } catch (e) {
      console.error("PlaybackService: Failed to trigger playPrevious:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log("PlaybackService: RemoteSeek triggered to:", event.position);
    TrackPlayer.seekTo(event.position).catch((err) => console.error("PlaybackService: seekTo error:", err));
  });

  let wasPlayingBeforeDuck = false;

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event: any) => {
    console.log("PlaybackService: RemoteDuck (audio interruption / call / video) triggered:", event);
    try {
      const { QueueManager } = require("./queueManager");
      const manager = QueueManager.getInstance();

      if (event.permanent) {
        wasPlayingBeforeDuck = false;
        if (manager.isPlaying) {
          manager.isPlaying = false;
          manager.syncWithZustand();
        }
        await TrackPlayer.pause().catch(() => {});
        return;
      }

      // 1. Ducking for notification sounds / navigation audio prompts
      if (event.ducking) {
        console.log("PlaybackService: Transient audio ducking (notification) -> lowering volume");
        await TrackPlayer.setVolume(0.2).catch(() => {});
      } else if (!event.paused) {
        // Restore volume when ducking ends
        await TrackPlayer.setVolume(1.0).catch(() => {});
      }

      // 2. Pause only on actual full pause interruptions (e.g. phone call ringing)
      if (event.paused) {
        if (manager.isPlaying) {
          wasPlayingBeforeDuck = true;
          manager.isPlaying = false;
          manager.syncWithZustand();
        }
        await TrackPlayer.pause().catch(() => {});
      } else if (event.shouldResume || (!event.paused && !event.ducking)) {
        await TrackPlayer.setVolume(1.0).catch(() => {});
        if (wasPlayingBeforeDuck) {
          console.log("PlaybackService: Call/interruption ended. Resuming playback...");
          wasPlayingBeforeDuck = false;
          manager.isPlaying = true;
          manager.syncWithZustand();
          await TrackPlayer.play().catch((err) => console.error("PlaybackService auto-resume error:", err));
        }
      }
    } catch (e) {
      TrackPlayer.pause().catch(() => {});
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log("PlaybackService: RemoteStop triggered");
    try {
      const { QueueManager } = require("./queueManager");
      const manager = QueueManager.getInstance();
      if (manager.isPlaying) {
        manager.togglePlay();
      } else {
        TrackPlayer.pause().catch(() => {});
      }
    } catch (e) {
      TrackPlayer.pause().catch(() => {});
    }
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
