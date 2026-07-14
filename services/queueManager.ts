import { Song } from "../types/song";
import { tryGetPlayer, loadAndPlay, clearLockScreen } from "./trackPlayer";
import { getRelatedSongs, resolveSong, searchSongs, getTrending } from "./saavn";
import { fetchSmartSongs } from "./smartQueue";
import { pushRecent, saveLastPlayed, loadRecent } from "./storage";
import { useToastStore } from "../store/toastStore";
import {
  normalizeSongTitle,
  extractPrimaryArtist,
  isAlternateVersion,
  isDuplicateSong,
  scoreRecommendation,
} from "../utils/songUtils";

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

    // Listen to native track transitions in the main thread
    const { default: TrackPlayer, Event } = require("react-native-track-player");

    // We only need PlaybackActiveTrackChanged to catch when the native player
    // transitions into next-placeholder or prev-placeholder, which tells us to skip tracks.
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event: any) => {
      const track = event.track;
      if (track) {
        console.log("QueueManager MainThread: PlaybackActiveTrackChanged ->", track.id);
        if (track.id === "next-placeholder") {
          this.playNext();
        } else if (track.id === "prev-placeholder") {
          this.playPrevious();
        }
      }
    });

    // Single listener for playback status updates
    player.addListener("playbackStatusUpdate", (status: any) => {
      // Synchronize play state
      if (status.playing !== this.isPlaying) {
        this.isPlaying = status.playing;
        this.syncWithZustand();
      }

      if (status.error) {
        console.error("Playback status error:", status.error);
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
    if (this.isResolving) {
      console.log("QueueManager: Already resolving, ignoring playNext request");
      return;
    }

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
    if (this.isResolving) {
      console.log("QueueManager: Already resolving, ignoring playPrevious request");
      return;
    }

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

    this.isResolving = true;
    this.syncWithZustand();

    let songToPlay = song;

    // Resolve URL if missing (e.g. for skeleton songs from local/online list)
    if (!songToPlay.url) {
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
        this.isResolving = false;
        this.syncWithZustand();
        await this.handlePlaybackError(idx);
        return;
      }
    }

    try {
      await loadAndPlay(songToPlay);
      this.currentlyPlayingId = songToPlay.id;
      
      pushRecent(songToPlay).catch(() => {});
      saveLastPlayed(songToPlay, 0).catch(() => {});
    } catch (err) {
      console.error("Playback load error:", err);
      this.isResolving = false;
      this.syncWithZustand();
      await this.handlePlaybackError(idx);
      return;
    }

    this.isResolving = false;
    this.syncWithZustand();
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

  public normalizeSongTitle(title: string): string {
    return normalizeSongTitle(title);
  }

  public extractPrimaryArtist(song: Song): string {
    return extractPrimaryArtist(song);
  }

  public isAlternateVersion(candidate: Song, currentSong: Song): boolean {
    return isAlternateVersion(candidate, currentSong);
  }

  public isDuplicateSong(candidate: Song, existingSongs: Song[]): boolean {
    return isDuplicateSong(candidate, existingSongs);
  }

  public scoreRecommendation(candidate: Song, seedSong: Song): number {
    return scoreRecommendation(candidate, seedSong);
  }

  public async buildArtistQueue(seedSong: Song): Promise<Song[]> {
    const artistSeed = this.extractPrimaryArtist(seedSong);
    const firstArtistWord = artistSeed ? artistSeed.split(/\s+/)[0] : "";
    const lang = seedSong.language || "tamil";
    const mood = seedSong.mood || "unknown";
    const energy = seedSong.energy || "medium";
    const genre = seedSong.genre || "unknown";

    const queries: string[] = [];
    if (artistSeed) {
      queries.push(`${artistSeed} ${lang} songs`);
    }
    if (firstArtistWord) {
      if (energy === "high") {
        queries.push(`${firstArtistWord} high energy songs`);
        queries.push(`${firstArtistWord} mass songs`);
      } else if (mood && mood !== "unknown") {
        queries.push(`${firstArtistWord} ${mood} songs`);
      }
    }
    const cleanTitle = this.normalizeSongTitle(seedSong.title);
    if (cleanTitle) {
      queries.push(`${lang} songs similar to ${cleanTitle}`);
    }
    if (genre && genre !== "unknown") {
      queries.push(`${lang} ${genre} songs`);
    }
    if (mood && mood !== "unknown") {
      queries.push(`${lang} ${mood} songs`);
    }

    // Fallbacks
    if (queries.length === 0) {
      if (seedSong.album) {
        queries.push(`${seedSong.album} ${lang} songs`);
      }
      if (genre && genre !== "unknown") {
        queries.push(`${lang} ${genre} songs`);
      }
      if (mood && mood !== "unknown") {
        queries.push(`${lang} ${mood} songs`);
      }
    }

    console.log(`QueueManager: Fetching recommendations for: ${seedSong.title}`);
    const searchPromises = queries.map(q => searchSongs(q, 15).catch(() => []));
    const suggestionsPromise = getRelatedSongs(seedSong.id).catch(() => []);

    const resultsArray = await Promise.all([...searchPromises, suggestionsPromise]);
    
    let candidatesPool: Song[] = [];
    for (const list of resultsArray) {
      if (Array.isArray(list)) {
        candidatesPool.push(...list);
      }
    }

    if (candidatesPool.length < 10) {
      try {
        const trending = await getTrending(lang);
        candidatesPool.push(...trending);
      } catch (e) {
        console.error("Failed to fetch trending as fallback:", e);
      }
    }

    // Deduplicate candidate pool
    const uniqueCandidates = new Map<string, Song>();
    for (const c of candidatesPool) {
      const key = c.id || c.url || `${c.title.toLowerCase().trim()}|${c.artist.toLowerCase().trim()}`;
      if (!uniqueCandidates.has(key)) {
        uniqueCandidates.set(key, c);
      }
    }
    const candidates = Array.from(uniqueCandidates.values());

    // Score and sort candidates
    const scoredCandidates = candidates
      .map(candidate => {
        const baseScore = this.scoreRecommendation(candidate, seedSong);
        if (baseScore === -Infinity) {
          return { song: candidate, score: -Infinity };
        }
        const score = baseScore + Math.random() * 5; // small diversity factor
        return { song: candidate, score };
      })
      .filter(item => item.score > -Infinity && item.song.id !== seedSong.id);

    scoredCandidates.sort((a, b) => b.score - a.score);

    // Build the list of recommended songs applying diversity rules
    const activeQueue = this.index >= 0 ? this.queue.slice(this.index) : [...this.queue];
    const recommendedSongs: Song[] = [];

    const recentSongs = await loadRecent();
    const recentIds = new Set(recentSongs.map(s => s.id));

    const canAdd = (candidate: Song, added: Song[]): boolean => {
      const fullQueueSoFar = [...activeQueue, ...added];
      
      if (this.isDuplicateSong(candidate, fullQueueSoFar)) {
        return false;
      }

      if (recentIds.has(candidate.id)) {
        return false;
      }

      const candNorm = this.normalizeSongTitle(candidate.title);
      const checkRange = fullQueueSoFar.slice(-20);
      if (checkRange.some(s => this.normalizeSongTitle(s.title) === candNorm)) {
        return false;
      }

      if (candidate.album) {
        const len = fullQueueSoFar.length;
        if (len >= 2) {
          const last1 = fullQueueSoFar[len - 1];
          const last2 = fullQueueSoFar[len - 2];
          if (last1.album && last2.album &&
              last1.album.toLowerCase().trim() === candidate.album.toLowerCase().trim() &&
              last2.album.toLowerCase().trim() === candidate.album.toLowerCase().trim()) {
            return false;
          }
        }
      }

      return true;
    };

    for (const item of scoredCandidates) {
      if (canAdd(item.song, recommendedSongs)) {
        recommendedSongs.push(item.song);
      }
      if (recommendedSongs.length >= 20) {
        break;
      }
    }

    return recommendedSongs;
  }

  public async appendRecommendations(seedSong: Song): Promise<void> {
    if (this.isResolving) {
      console.log("QueueManager: Cannot append, track is transitioning");
      return;
    }
    
    console.log(`QueueManager: Building recommendations seeded by: ${seedSong.title}`);
    const recommendations = await this.buildArtistQueue(seedSong);
    
    if (recommendations.length > 0) {
      const formattedRecs = recommendations.map(s => 
        s.source === "local" ? s : { ...s, url: "" }
      );
      this.queue = [...this.queue, ...formattedRecs];
      console.log(`QueueManager: Appended ${formattedRecs.length} songs.`);
      this.syncWithZustand();
    } else {
      console.warn("QueueManager: No recommendations found to append.");
    }
  }

  // Check queue size and append recommendations if < 15 tracks remain or total queue size is < 30
  public async appendRecommendedSongsIfNeeded() {
    if (this.isResolving) {
      console.log("QueueManager: Cannot append, track is transitioning");
      return;
    }
    if (this.isFetchingRelated) {
      console.log("QueueManager: Already fetching recommendations");
      return;
    }

    const remaining = this.queue.length - 1 - this.index;
    if (remaining < 15 || this.queue.length < 30) {
      const currentSong = this.queue[this.index];
      if (!currentSong) return;

      this.isFetchingRelated = true;
      this.syncWithZustand();

      try {
        await this.appendRecommendations(currentSong);
      } catch (err) {
        console.error("Failed to append recommendations:", err);
      } finally {
        this.isFetchingRelated = false;
        this.syncWithZustand();
      }
    }
  }

  // Fetch and append recommended songs
  public async appendRecommendedSongs() {
    const currentSong = this.queue[this.index];
    if (!currentSong) return;

    this.isFetchingRelated = true;
    this.syncWithZustand();

    try {
      await this.appendRecommendations(currentSong);
    } catch (err) {
      console.error("Failed to append recommendations:", err);
    } finally {
      this.isFetchingRelated = false;
      this.syncWithZustand();
    }
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
