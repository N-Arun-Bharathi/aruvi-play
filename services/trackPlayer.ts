import TrackPlayer, { Capability, State, Event } from "react-native-track-player";
import { Song } from "../types/song";

class TrackPlayerWrapper {
  private listeners: { [event: string]: Function[] } = {};
  public volume: number = 1.0;
  public playing: boolean = false;
  public currentTime: number = 0;
  public duration: number = 0;
  private currentUri: string = "";
  private isInitialized = false;
  private isResetting = false;
  private wasPlayingBeforeDuck = false;

  constructor() {}

  private async ensureInitialized() {
    if (this.isInitialized) return;
    try {
      await TrackPlayer.setupPlayer();
      this.isInitialized = true;
      this.setupListeners();
    } catch (e) {
      this.isInitialized = true;
      console.warn("TrackPlayer setup warning:", e);
    }
  }

  private setupListeners() {
    try {
      // Listen to react-native-track-player progress update events
      TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (data) => {
        if (this.isResetting) return;
        this.currentTime = data.position;
        this.duration = data.duration;
        this.emitPlaybackStatus();
      });

      // Listen to state changes
      TrackPlayer.addEventListener(Event.PlaybackState, (data: any) => {
        if (this.isResetting) return;
        const stateStr = typeof data.state === "string" ? data.state : String(data.state);
        const isPlaying = stateStr === State.Playing || (data.state as any) === 3 || stateStr === "playing";
        if (this.playing !== isPlaying) {
          this.playing = isPlaying;
          this.emitPlaybackStatus();
        }
        const isEnded = stateStr === State.Ended || (data.state as any) === 6 || stateStr === "ended";
        if (isEnded) {
          console.log("TrackPlayerWrapper: Event.PlaybackState ended received:", data.state);
          this.playing = false;
          this.currentTime = 0;
          this.duration = 0;
          this.emitPlaybackStatus(true);
        }
      });

      // Listen to queue ended event
      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (data) => {
        if (this.isResetting) return;
        console.log("TrackPlayerWrapper: Event.PlaybackQueueEnded received", data);
        this.playing = false;
        this.currentTime = 0;
        this.duration = 0;
        this.emitPlaybackStatus(true);
      });

      // Listen to audio interruptions (incoming call, message notification, other apps)
      TrackPlayer.addEventListener(Event.RemoteDuck, async (event: any) => {
        console.log("TrackPlayerWrapper: Event.RemoteDuck received", event);
        if (event.permanent) {
          this.wasPlayingBeforeDuck = false;
          this.playing = false;
          this.emitPlaybackStatus();
          return;
        }

        if (event.paused || event.ducking) {
          if (this.playing) {
            this.wasPlayingBeforeDuck = true;
          }
          this.playing = false;
          this.emitPlaybackStatus();
        } else if (event.shouldResume || (!event.paused && !event.ducking)) {
          if (this.wasPlayingBeforeDuck) {
            console.log("TrackPlayerWrapper: Interruption ended (call/notification), auto-resuming playback...");
            this.wasPlayingBeforeDuck = false;
            try {
              await this.play();
            } catch (err) {
              console.error("Auto-resume playback error:", err);
            }
          }
        }
      });

      // Listen to playback error events
      TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
        if (this.isResetting) return;
        console.error("TrackPlayerWrapper: Event.PlaybackError received", error);
        this.playing = false;
        this.currentTime = 0;
        this.duration = 0;
        this.notify("playbackStatusUpdate", {
          currentTime: 0,
          duration: 0,
          playing: false,
          didJustFinish: false,
          isLoaded: false,
          error: error || "Playback error occurred",
          playbackState: "error",
        });
      });
    } catch (e) {
      console.warn("TrackPlayer setupListeners warning:", e);
    }
  }

  private emitPlaybackStatus(didJustFinish = false) {
    const status = {
      currentTime: this.currentTime,
      duration: this.duration,
      playing: this.playing,
      didJustFinish,
      isLoaded: true,
      playbackState: this.playing ? "ready" : "paused",
    };
    this.notify("playbackStatusUpdate", status);
  }

  private notify(event: string, data: any) {
    console.log(`TrackPlayerWrapper: notify event: ${event}`, data);
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }

  public addListener(event: string, callback: Function) {
    console.log(`TrackPlayerWrapper: addListener for event: ${event}`);
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return {
      remove: () => {
        console.log(`TrackPlayerWrapper: removeListener for event: ${event}`);
        this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
      },
    };
  }

  public emitRemoteAction(action: string) {
    console.log(`TrackPlayerWrapper: emitRemoteAction: ${action}`);
    this.notify("remoteAction", { action });
  }

  public async play() {
    await this.ensureInitialized();
    this.playing = true;
    await TrackPlayer.play();
  }

  public async pause() {
    await this.ensureInitialized();
    this.playing = false;
    await TrackPlayer.pause();
  }

  public async seekTo(seconds: number) {
    await this.ensureInitialized();
    await TrackPlayer.seekTo(seconds);
    this.currentTime = seconds;
    this.emitPlaybackStatus();
  }

  public replace(source: { uri: string }) {
    this.currentUri = source.uri;
  }

  public async setActiveForLockScreen(active: boolean, metadata?: any, options?: any) {
    await this.ensureInitialized();
    this.isResetting = true;
    this.currentTime = 0;
    this.duration = 0;
    try {
      if (active && metadata) {
        await TrackPlayer.reset();
        
        const currentTrack = {
          id: metadata.id || metadata.title || "track",
          url: this.currentUri,
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.albumTitle,
          artwork: metadata.artworkUrl,
        };
        
        await TrackPlayer.add([currentTrack]);
        
        await TrackPlayer.updateOptions({
          stoppingAppPausesPlayback: true,
          alwaysPauseOnInterruption: false,
          progressUpdateEventInterval: 0.25,
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
        });
      } else {
        await TrackPlayer.reset();
      }
    } finally {
      setTimeout(() => {
        this.isResetting = false;
      }, 150);
    }
  }

  public updateLockScreenMetadata(metadata: any) {
    // Auto handled by RNTP
  }
}

const playerWrapper = new TrackPlayerWrapper();

export async function setupPlayer(): Promise<boolean> {
  try {
    await TrackPlayer.setupPlayer();
    return true;
  } catch (error) {
    console.error("Failed to setup player:", error);
    return false;
  }
}

export function tryGetPlayer(): any {
  return playerWrapper;
}

export async function stopAndResetPlayer() {
  try {
    if (playerWrapper) {
      playerWrapper.playing = false;
      playerWrapper.currentTime = 0;
      playerWrapper.duration = 0;
    }
    await TrackPlayer.pause().catch(() => {});
    await TrackPlayer.reset().catch(() => {});
  } catch (e) {
    console.warn("stopAndResetPlayer error:", e);
  }
}

export async function loadAndPlay(song: Song) {
  if (!playerWrapper) return;
  console.log("loadAndPlay: Instant playback transition for:", song.title);
  playerWrapper.currentTime = 0;
  playerWrapper.duration = 0;
  playerWrapper.playing = true;
  playerWrapper.replace({ uri: song.url });

  const { useLibraryStore } = require("../store/likedStore");
  const isLiked = useLibraryStore.getState().isLiked(song);

  const currentTrack = {
    id: song.id || song.title,
    url: song.url,
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.artwork,
  };

  try {
    await TrackPlayer.reset();
    await TrackPlayer.add([currentTrack]);
    await TrackPlayer.play();
    console.log("loadAndPlay: Playback started instantly!");
  } catch (playErr) {
    console.error("loadAndPlay: playerWrapper.play failed:", playErr);
    throw playErr;
  }

  // Update lockscreen options asynchronously in background
  TrackPlayer.updateOptions({
    stoppingAppPausesPlayback: true,
    alwaysPauseOnInterruption: false,
    progressUpdateEventInterval: 0.25,
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
  }).catch(() => {});
}

export function updateLockScreen(song: Song) {
  // Auto handled
}

export function clearLockScreen() {
  if (playerWrapper) {
    playerWrapper.setActiveForLockScreen(false);
  }
}
