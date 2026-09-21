import TrackPlayer, { Event } from "react-native-track-player";

export async function playbackService() {
  console.log("PlaybackService: Registering remote notification event listeners...");

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("PlaybackService: RemotePlay triggered");
    try {
      await TrackPlayer.play();
      const { QueueManager } = require("./queueManager");
      const manager = QueueManager.getInstance();
      if (!manager.isPlaying) {
        manager.isPlaying = true;
        manager.syncWithZustand();
      }
    } catch (e) {
      console.error("PlaybackService: RemotePlay error:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("PlaybackService: RemotePause triggered");
    try {
      await TrackPlayer.pause();
      const { QueueManager } = require("./queueManager");
      const manager = QueueManager.getInstance();
      if (manager.isPlaying) {
        manager.isPlaying = false;
        manager.syncWithZustand();
      }
    } catch (e) {
      console.error("PlaybackService: RemotePause error:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log("PlaybackService: RemoteNext triggered -> QueueManager.playNext()");
    try {
      const { QueueManager } = require("./queueManager");
      await QueueManager.getInstance().playNext();
    } catch (e) {
      console.error("PlaybackService: RemoteNext error:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log("PlaybackService: RemotePrevious triggered -> QueueManager.playPrevious()");
    try {
      const { QueueManager } = require("./queueManager");
      await QueueManager.getInstance().playPrevious();
    } catch (e) {
      console.error("PlaybackService: RemotePrevious error:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSkip, async (event: any) => {
    console.log("PlaybackService: RemoteSkip triggered to index:", event?.index);
    try {
      const { QueueManager } = require("./queueManager");
      const manager = QueueManager.getInstance();
      if (typeof event?.index === "number" && event.index >= 0 && event.index < manager.queue.length) {
        manager.index = event.index;
        manager.isPlaying = true;
        manager.syncWithZustand();
        await manager.loadIndex(event.index);
      } else {
        await manager.playNext();
      }
    } catch (e) {
      console.error("PlaybackService: RemoteSkip error:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event: any) => {
    console.log("PlaybackService: RemoteJumpForward triggered:", event?.interval);
    try {
      const interval = event?.interval || 10;
      const progress = await TrackPlayer.getProgress().catch(() => ({ position: 0 }));
      await TrackPlayer.seekTo(progress.position + interval);
    } catch (e) {
      console.error("PlaybackService: RemoteJumpForward error:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event: any) => {
    console.log("PlaybackService: RemoteJumpBackward triggered:", event?.interval);
    try {
      const interval = event?.interval || 10;
      const progress = await TrackPlayer.getProgress().catch(() => ({ position: 0 }));
      await TrackPlayer.seekTo(Math.max(0, progress.position - interval));
    } catch (e) {
      console.error("PlaybackService: RemoteJumpBackward error:", e);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event: any) => {
    console.log("PlaybackService: RemoteSeek triggered to:", event?.position);
    try {
      if (typeof event?.position === "number") {
        await TrackPlayer.seekTo(event.position);
      }
    } catch (err) {
      console.error("PlaybackService: RemoteSeek error:", err);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("PlaybackService: RemoteStop triggered");
    try {
      await TrackPlayer.pause().catch(() => {});
      const { QueueManager } = require("./queueManager");
      const manager = QueueManager.getInstance();
      manager.isPlaying = false;
      manager.syncWithZustand();
    } catch (e) {
      console.error("PlaybackService: RemoteStop error:", e);
    }
  });

  let wasPlayingBeforeDuck = false;

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event: any) => {
    console.log("PlaybackService: RemoteDuck (audio interruption) triggered:", event);
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
        console.log("PlaybackService: Transient audio ducking -> lowering volume");
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
          console.log("PlaybackService: Interruption ended. Resuming playback...");
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
}

