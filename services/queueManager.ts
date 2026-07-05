import { Song } from "../types/song";
import { tryGetPlayer, loadAndPlay, clearLockScreen } from "./trackPlayer";
import { getRelatedSongs, resolveSong } from "./saavn";
import { fetchSmartSongs } from "./smartQueue";
import { pushRecent, saveLastPlayed } from "./storage";
import { useToastStore } from "../store/toastStore";

export class QueueManager {
  private static instance: QueueManager | null = null;

  public queue: Song[] = [];
  public index: number = -1;
  public isPlaying: boolean = false;
  public lastFinishedId: string | null = null;
  public isResolving: boolean = false;
  public currentlyPlayingId: string | null = null;
  private isFetchingRelated: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  private syncWithZustand() {
    const { usePlayerStore } = require("../store/playerStore");
    const store = usePlayerStore.getState();
    // We update Zustand so it's a reactive reflection of QueueManager
    usePlayerStore.setState({
      queue: this.queue,
      index: this.index,
      current: this.index >= 0 && this.index < this.queue.length ? this.queue[this.index] : null,
      isPlaying: this.isPlaying,
      resolving: this.isResolving,
      fetchingRelated: this.isFetchingRelated,
    });
    
    // Sync with room store if connected to a music room
    try {
      const { syncPlaybackWithRoom } = require("../store/roomStore");
      syncPlaybackWithRoom();
    } catch (e) {
      // Room store might not be initialized or imported yet
    }
  }

  public async init() {
    const player = tryGetPlayer();
    if (!player) return;

    // Single listener for playback status updates
    player.addListener("playbackStatusUpdate", (status) => {
      // Synchronize play state
      if (status.playing !== this.isPlaying) {
        this.isPlaying = status.playing;
        this.syncWithZustand();
      }

      if ((status as any).error) {
        console.error("Playback status error:", (status as any).error);
        this.handlePlaybackError(this.index);
        return;
      }

      if (status.didJustFinish) {
        this.onTrackFinished();
      }
    });
  }

  // Play a song and optionally set a new context queue
  // Play a song and optionally set a new context queue
  public async playSong(song: Song, contextQueue?: Song[]) {
    let newQueue = contextQueue && contextQueue.length ? [...contextQueue] : [song];

    // Deduplicate incoming context queue
    newQueue = this.deduplicateQueue(newQueue);

    let idx = newQueue.findIndex(
      (s) => s.id === song.id || (s.title.toLowerCase().trim() === song.title.toLowerCase().trim() && s.artist.toLowerCase().trim() === song.artist.toLowerCase().trim())
    );

    if (idx < 0) {
      newQueue = [song, ...newQueue];
      idx = 0;
    }

    // Keep active song's URL intact, strip URLs for other online songs in the queue
    // to force fresh URL resolution when they are played (preventing expired URL skips).
    newQueue = newQueue.map((s, i) => {
      if (i === idx) return s;
      if (s.source === "local") return s;
      return { ...s, url: "" };
    });

    this.queue = newQueue;
    this.index = idx;
    this.isPlaying = true;
    this.syncWithZustand();

    await this.loadIndex(idx);
    
    // Check if we need to auto-append recommendations
    await this.appendRecommendedSongsIfNeeded();
  }

  // Play a song next in queue (immediately after current song)
  public playNextImmediately(song: Song) {
    // If the song is already in the queue, remove it to prevent duplicates
    this.queue = this.queue.filter((s) => !this.isDuplicate(s, song));

    // Strip URL for future playback if it's not local
    const songToInsert = song.source === "local" ? song : { ...song, url: "" };

    if (this.index === -1) {
      this.queue = [song];
      this.index = 0;
    } else {
      this.queue.splice(this.index + 1, 0, songToInsert);
    }
    
    this.syncWithZustand();
    useToastStore.getState().show("Playing Next");
  }

  // Add song to the queue (immediately after the current song)
  public addToQueue(song: Song) {
    const exists = this.queue.some((s) => this.isDuplicate(s, song));
    if (exists) {
      useToastStore.getState().show("Already in Queue");
      return;
    }

    // Strip URL for future playback if it's not local
    const songToInsert = song.source === "local" ? song : { ...song, url: "" };

    if (this.index === -1) {
      this.queue = [song];
      this.index = 0;
      this.isPlaying = true;
      this.syncWithZustand();
      this.loadIndex(0);
    } else {
      this.queue.splice(this.index + 1, 0, songToInsert);
      this.syncWithZustand();
      this.appendRecommendedSongsIfNeeded();
    }
    useToastStore.getState().show("Added to Queue");
  }

  public async playNext() {
    const { usePlayerStore } = require("../store/playerStore");
    const store = usePlayerStore.getState();
    let nextIdx = this.index + 1;

    if (nextIdx >= this.queue.length) {
      if (store.repeat === "all") {
        nextIdx = 0;
      } else {
        this.isPlaying = false;
        this.syncWithZustand();
        clearLockScreen();
        return;
      }
    }

    this.index = nextIdx;
    this.isPlaying = true;
    this.syncWithZustand();

    await this.loadIndex(nextIdx);
    await this.appendRecommendedSongsIfNeeded();
  }

  public async playPrevious() {
    const player = tryGetPlayer();
    if (player && player.currentTime > 4) {
      await player.seekTo(0);
      return;
    }

    const prevIdx = this.index - 1;
    if (prevIdx < 0) {
      if (player) await player.seekTo(0);
      return;
    }

    this.index = prevIdx;
    this.isPlaying = true;
    this.syncWithZustand();

    await this.loadIndex(prevIdx);
  }

  public togglePlay() {
    const player = tryGetPlayer();
    if (!player) return;

    if (player.playing) {
      player.pause();
      this.isPlaying = false;
    } else {
      player.play();
      this.isPlaying = true;
    }
    this.syncWithZustand();
  }

  public seekTo(seconds: number) {
    const player = tryGetPlayer();
    if (player) {
      player.seekTo(seconds);
    }
  }

  public syncQueue(newQueue: Song[]) {
    // Safely update queue (e.g. from drag to reorder)
    const currentSong = this.queue[this.index];
    this.queue = newQueue;
    
    // Find new index of current song to keep playback synchronized
    if (currentSong) {
      const newIdx = newQueue.findIndex((s) => s.id === currentSong.id);
      if (newIdx !== -1) {
        this.index = newIdx;
      }
    }
    this.syncWithZustand();
  }

  // Load song at index and play it, handling errors and resolution
  private async loadIndex(idx: number) {
    const song = this.queue[idx];
    if (!song) return;

    let songToPlay = song;

    // Resolve URL if missing (e.g. for skeleton songs from local/online list)
    if (!songToPlay.url) {
      this.isResolving = true;
      this.syncWithZustand();

      try {
        const resolved = await resolveSong(song.title, song.artist);
        if (resolved) {
          songToPlay = { ...resolved, id: song.id };
          this.queue[idx] = songToPlay;
        } else {
          throw new Error(`Failed to resolve URL for ${song.title}`);
        }
      } catch (err) {
        console.error("Resolution error:", err);
        // Error Recovery: Skip only that song, play next immediately
        this.isResolving = false;
        this.syncWithZustand();
        await this.handlePlaybackError(idx);
        return;
      }

      this.isResolving = false;
      this.syncWithZustand();
    }

    try {
      loadAndPlay(songToPlay);
      this.currentlyPlayingId = songToPlay.id;
      
      pushRecent(songToPlay).catch(() => {});
      saveLastPlayed(songToPlay, 0).catch(() => {});
    } catch (err) {
      console.error("Playback load error:", err);
      await this.handlePlaybackError(idx);
    }
  }

  private async handlePlaybackError(failedIdx: number) {
    console.warn(`Song at index ${failedIdx} failed. Skipping...`);
    // Check if next song is available
    if (failedIdx + 1 < this.queue.length) {
      this.index = failedIdx + 1;
      this.syncWithZustand();
      // Add small timeout to avoid rapid loop
      setTimeout(() => {
        this.loadIndex(this.index);
      }, 800);
    } else {
      // Queue ended with failure, try to append and play
      await this.appendRecommendedSongs();
      if (this.queue.length > failedIdx + 1) {
        this.index = failedIdx + 1;
        this.syncWithZustand();
        this.loadIndex(this.index);
      } else {
        this.isPlaying = false;
        this.syncWithZustand();
      }
    }
  }

  private async onTrackFinished() {
    const { usePlayerStore } = require("../store/playerStore");
    const store = usePlayerStore.getState();
    const currentSong = this.queue[this.index];
    if (!currentSong) return;

    // Guard: Only advance if the song that just finished is the one that was actually loaded and playing,
    // and prevent duplicate processing of the same finished track.
    if (currentSong.id !== this.currentlyPlayingId || currentSong.id === this.lastFinishedId) {
      return;
    }

    this.lastFinishedId = currentSong.id;

    if (store.repeat === "one") {
      this.loadIndex(this.index);
      return;
    }

    // Auto-advance
    await this.playNext();
  }

  // Check queue size and append recommendations if < 3 songs remain
  public async appendRecommendedSongsIfNeeded() {
    // Disabled as requested
    return;
  }

  // Fetch and append recommended songs
  public async appendRecommendedSongs() {
    // Disabled as requested
    return;
  }

  private deduplicateQueue(songs: Song[]): Song[] {
    const uniqueMap = new Map<string, Song>();
    for (const s of songs) {
      const key = `${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    }
    return Array.from(uniqueMap.values());
  }

  private isDuplicate(s1: Song, s2: Song): boolean {
    if (s1.id === s2.id) return true;
    const t1 = s1.title.toLowerCase().trim();
    const t2 = s2.title.toLowerCase().trim();
    const a1 = s1.artist.toLowerCase().trim();
    const a2 = s2.artist.toLowerCase().trim();
    return t1 === t2 && a1 === a2;
  }
}
