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
        this.currentTime = data.position;
        this.duration = data.duration;
        this.emitPlaybackStatus();
      });

      // Listen to state changes
      TrackPlayer.addEventListener(Event.PlaybackState, (data: any) => {
        const stateStr = typeof data.state === "string" ? data.state : String(data.state);
        const isPlaying = stateStr === State.Playing || (data.state as any) === 3 || stateStr === "playing";
        if (this.playing !== isPlaying) {
          this.playing = isPlaying;
          this.emitPlaybackStatus();
        }
        const isEnded = stateStr === State.Ended || (data.state as any) === 6 || stateStr === "ended";
        const isNearEnd = this.duration > 0 && this.currentTime >= Math.max(1, this.duration - 3);
        if (isEnded || (isNearEnd && (stateStr === State.Stopped || stateStr === "stopped"))) {
          console.log("TrackPlayerWrapper: Event.PlaybackState ended received:", data.state);
          this.emitPlaybackStatus(true);
        }
      });

      // Listen to queue ended event
      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (data) => {
        console.log("TrackPlayerWrapper: Event.PlaybackQueueEnded received", data);
        this.playing = false;
        this.emitPlaybackStatus(true);
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
    if (active && metadata) {
      await TrackPlayer.reset();
      
      const currentTrack = {
        id: metadata.title || "track",
        url: this.currentUri,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.albumTitle,
        artwork: metadata.artworkUrl,
      };
      
      await TrackPlayer.add([currentTrack]);
      
      await TrackPlayer.updateOptions({
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

      if (this.playing) {
        await TrackPlayer.play();
      }
    } else {
      await TrackPlayer.reset();
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

export async function loadAndPlay(song: Song) {
  if (!playerWrapper) return;
  console.log("loadAndPlay: Starting playback sequence for:", song.title);
  await playerWrapper.pause();
  playerWrapper.replace({ uri: song.url });
  try {
    const { useLibraryStore } = require("../store/likedStore");
    const isLiked = useLibraryStore.getState().isLiked(song);
    
    console.log("loadAndPlay: Setting up lockscreen queue...");
    await playerWrapper.setActiveForLockScreen(true, {
      title: song.title,
      artist: song.artist,
      albumTitle: song.album,
      artworkUrl: song.artwork,
      isLiked,
    });
  } catch (e) {
    console.error("Failed to set lockscreen:", e);
  }
  console.log("loadAndPlay: Calling play...");
  await playerWrapper.play();
  console.log("loadAndPlay: Playback sequence completed successfully!");
}

export function updateLockScreen(song: Song) {
  // Auto handled
}

export function clearLockScreen() {
  if (playerWrapper) {
    playerWrapper.setActiveForLockScreen(false);
  }
}
