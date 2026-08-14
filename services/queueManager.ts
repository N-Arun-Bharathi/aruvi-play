import { Song } from "../types/song";
import { tryGetPlayer, loadAndPlay, clearLockScreen } from "./trackPlayer";
import { getRelatedSongs, resolveSong, searchSongs, getTrending } from "./saavn";
import { fetchSmartSongs } from "./smartQueue";
import { pushRecent, saveLastPlayed, loadRecent } from "./storage";
import { useToastStore } from "../store/toastStore";
import { dbSaveQueue, dbGetQueue, dbSavePlaybackSession } from "./sqlite";
import { useAuthStore } from "../store/authStore";
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
  private isTransitioning: boolean = false;
  private isFinishing: boolean = false;
  private lastSessionSyncTime: number = 0;
  private queueSaveTimer: any = null;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  private getActiveUserId(): string {
    const user = useAuthStore.getState().userProfile;
    return user?.id || "guest-user";
  }

  private scheduleQueueSave() {
    if (this.queueSaveTimer) clearTimeout(this.queueSaveTimer);
    this.queueSaveTimer = setTimeout(() => {
      this.saveQueueImmediately();
    }, 300);
  }

  public saveQueueImmediately() {
    if (this.queueSaveTimer) {
      clearTimeout(this.queueSaveTimer);
      this.queueSaveTimer = null;
    }
    if (this.queue.length === 0) return;

    const userId = this.getActiveUserId();
    const currentQueue = [...this.queue];
    const currentIndex = this.index;

    // Fast atomic save to AsyncStorage
    const { saveActiveQueue } = require("./storage");
    saveActiveQueue(currentQueue, currentIndex).catch((e: any) =>
      console.error("Failed to save active queue to AsyncStorage", e)
    );

    // Save to SQLite
    dbSaveQueue(userId, "active-queue-session", currentIndex, currentQueue).catch(
      (e) => console.error("Failed to save active queue to SQLite", e)
    );
  }

  private syncWithZustand() {
    const { usePlayerStore } = require("../store/playerStore");
    const store = usePlayerStore.getState();

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
    } catch (e) {}

    // Debounce active queue save to SQLite/AsyncStorage (300ms)
    this.scheduleQueueSave();

    // Sync playback session (throttled or forced on state change)
    this.syncPlaybackSession(false);
  }

  public async syncPlaybackSession(force = false) {
    const now = Date.now();
    if (!force && now - this.lastSessionSyncTime < 15000) {
      return; // Throttle to 15s
    }
    this.lastSessionSyncTime = now;

    const userId = this.getActiveUserId();
    const currentSong = this.index >= 0 && this.index < this.queue.length ? this.queue[this.index] : null;
    const player = tryGetPlayer();

    dbSavePlaybackSession({
      userId,
      currentSongId: currentSong ? currentSong.id : null,
      positionSeconds: player ? player.currentTime : 0,
      isPlaying: this.isPlaying,
      repeatMode: "off", // Sync repeat modes if needed
      shuffleEnabled: false,
    }).catch((e) => console.error("Failed to sync playback session to SQLite", e));
  }

  public async init() {
    const player = tryGetPlayer();
    if (!player) return;

    const { AppState } = require("react-native");

    // Flush active queue save whenever app transitions to background or inactive
    AppState.addEventListener("change", (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        console.log("QueueManager: App going to background/inactive, saving active queue immediately...");
        this.saveQueueImmediately();
      }
    });

    // Single listener for playback status updates
    player.addListener("playbackStatusUpdate", (status: any) => {
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

    // Restore queue and last played song from SQLite/AsyncStorage on startup
    try {
      const { loadLastPlayed, loadRecent, loadActiveQueue } = require("./storage");
      const userId = this.getActiveUserId();
      let restoredSongs: Song[] = [];
      let restoredIndex: number = 0;

      const saved = await dbGetQueue(userId);
      if (saved && saved.songs && saved.songs.length > 0) {
        restoredSongs = saved.songs;
        restoredIndex = saved.index >= 0 && saved.index < saved.songs.length ? saved.index : 0;
        console.log(`QueueManager: Restored queue from SQLite with ${restoredSongs.length} songs at index ${restoredIndex}`);
      } else {
        const asyncSaved = await loadActiveQueue();
        if (asyncSaved && asyncSaved.songs && asyncSaved.songs.length > 0) {
          restoredSongs = asyncSaved.songs;
          restoredIndex = asyncSaved.index >= 0 && asyncSaved.index < asyncSaved.songs.length ? asyncSaved.index : 0;
          console.log(`QueueManager: Restored queue from AsyncStorage with ${restoredSongs.length} songs at index ${restoredIndex}`);
        }
      }

      if (restoredSongs.length > 0) {
        this.queue = restoredSongs;
        this.index = restoredIndex;
        this.isPlaying = false;
        this.syncWithZustand();
      } else {
        const lastPlayed = await loadLastPlayed();
        if (lastPlayed && lastPlayed.song) {
          this.queue = [lastPlayed.song];
          this.index = 0;
          this.isPlaying = false;
          this.syncWithZustand();
          console.log(`QueueManager: Restored single last played song: ${lastPlayed.song.title}`);
        } else {
          const recents = await loadRecent();
          if (recents && recents.length > 0) {
            this.queue = recents;
            this.index = 0;
            this.isPlaying = false;
            this.syncWithZustand();
            console.log(`QueueManager: Restored last played song from recents: ${recents[0].title}`);
          }
        }
      }
    } catch (e) {
      console.error("QueueManager: Failed to restore active queue or last played song", e);
    }
  }

  public async playSong(song: Song, contextQueue?: Song[]) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    try {
      let newQueue = contextQueue && contextQueue.length ? [...contextQueue] : [song];
      newQueue = this.deduplicateQueue(newQueue);

      let idx = newQueue.findIndex(
        (s) => s.id === song.id || (s.title.toLowerCase().trim() === song.title.toLowerCase().trim() && s.artist.toLowerCase().trim() === song.artist.toLowerCase().trim())
      );

      if (idx < 0) {
        newQueue = [song, ...newQueue];
        idx = 0;
      }

      this.queue = newQueue;
      this.index = idx;
      this.isPlaying = true;
      this.syncWithZustand();

      await this.loadIndex(idx);
      await this.appendRecommendedSongsIfNeeded();
    } finally {
      this.isTransitioning = false;
    }
  }

  public playNextImmediately(song: Song) {
    const songToInsert = song;

    if (this.index === -1 || this.queue.length === 0) {
      this.queue = [songToInsert];
      this.index = 0;
      this.isPlaying = true;
      this.syncWithZustand();
      this.loadIndex(0);
    } else {
      const currentSong = this.queue[this.index];
      // Filter out duplicate if it exists elsewhere in queue (excluding current playing song)
      const filteredQueue = this.queue.filter((s, idx) => idx === this.index || !this.isDuplicate(s, song));
      const newCurrentIdx = filteredQueue.findIndex((s) => s.id === currentSong?.id);
      this.index = newCurrentIdx !== -1 ? newCurrentIdx : this.index;

      // Insert song as the NEXT item right after current playing song
      filteredQueue.splice(this.index + 1, 0, songToInsert);
      this.queue = filteredQueue;
      this.syncWithZustand();
    }
    useToastStore.getState().show("Will Play Next");
  }

  public addToQueue(song: Song) {
    const songToInsert = song;

    if (this.index === -1 || this.queue.length === 0) {
      this.queue = [songToInsert];
      this.index = 0;
      this.isPlaying = true;
      this.syncWithZustand();
      this.loadIndex(0);
      useToastStore.getState().show("Added to Queue");
      return;
    }

    const exists = this.queue.some((s) => this.isDuplicate(s, song));
    if (exists) {
      useToastStore.getState().show("Already in Queue");
      return;
    }

    // Append song to the end of the queue
    this.queue.push(songToInsert);
    this.syncWithZustand();
    useToastStore.getState().show("Added to End of Queue");
  }

  public async playNext() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    try {
      const { usePlayerStore } = require("../store/playerStore");
      const store = usePlayerStore.getState();
      let nextIdx = this.index + 1;

      if (nextIdx >= this.queue.length) {
        console.log("QueueManager: playNext reached end of queue, attempting recommendations...");
        await this.appendRecommendedSongs();
      }

      if (nextIdx >= this.queue.length) {
        if (store.repeat === "all" && this.queue.length > 0) {
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
      this.appendRecommendedSongsIfNeeded().catch(() => {});
    } finally {
      this.isTransitioning = false;
    }
  }

  public async playPrevious() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    try {
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
    } finally {
      this.isTransitioning = false;
    }
  }

  public togglePlay() {
    const player = tryGetPlayer();
    if (!player) return;

    if (this.currentlyPlayingId === null && this.index >= 0 && this.index < this.queue.length) {
      this.loadIndex(this.index);
      return;
    }

    if (player.playing) {
      player.pause();
      this.isPlaying = false;
    } else {
      player.play();
      this.isPlaying = true;
    }
    this.syncWithZustand();
    this.syncPlaybackSession(true); // Force sync on state switch
  }

  public seekTo(seconds: number) {
    const player = tryGetPlayer();
    if (player) {
      player.seekTo(seconds);
      this.syncPlaybackSession(true);
    }
  }

  public syncQueue(newQueue: Song[]) {
    const currentSong = this.queue[this.index];
    this.queue = newQueue;
    
    if (currentSong) {
      const newIdx = newQueue.findIndex((s) => s.id === currentSong.id);
      if (newIdx !== -1) {
        this.index = newIdx;
      }
    }
    this.syncWithZustand();
  }

  private async loadIndex(idx: number) {
    const song = this.queue[idx];
    if (!song) return;

    this.lastFinishedId = null;
    this.currentlyPlayingId = song.id;
    this.isResolving = true;
    this.syncWithZustand();

    let songToPlay = song;

    if (!songToPlay.url && songToPlay.source !== "local") {
      try {
        console.log(`QueueManager: Resolving fresh stream URL for: ${song.title}`);
        const resolved = await resolveSong(song.title, song.artist, song.id);
        if (resolved && resolved.url) {
          songToPlay = { ...resolved, id: song.id };
          this.queue[idx] = songToPlay;
        } else {
          throw new Error(`Failed to resolve stream URL for ${song.title}`);
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
      // Clear URL on failure so next attempt fetches a new stream link
      if (this.queue[idx] && this.queue[idx].source !== "local") {
        this.queue[idx].url = "";
      }
      this.isResolving = false;
      this.syncWithZustand();
      await this.handlePlaybackError(idx);
      return;
    }

    this.isResolving = false;
    this.syncWithZustand();
    
    // Prefetch URL for the next song in queue so playback transition is instant
    this.prefetchNextSongUrl(idx + 1);
  }

  private prefetchNextSongUrl(startIndex: number) {
    for (let i = startIndex; i <= startIndex + 2; i++) {
      const targetSong = this.queue[i];
      if (targetSong && !targetSong.url && targetSong.source !== "local") {
        const targetIdx = i;
        resolveSong(targetSong.title, targetSong.artist, targetSong.id)
          .then((resolved) => {
            if (resolved && resolved.url && this.queue[targetIdx]) {
              this.queue[targetIdx] = { ...resolved, id: targetSong.id };
            }
          })
          .catch(() => {});
      }
    }
  }

  private async handlePlaybackError(failedIdx: number) {
    console.warn(`Song at index ${failedIdx} failed. Skipping...`);
    if (failedIdx + 1 < this.queue.length) {
      this.index = failedIdx + 1;
      this.syncWithZustand();
      setTimeout(() => {
        this.loadIndex(this.index);
      }, 800);
    } else {
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

  public async onTrackFinished() {
    if (this.isResolving || this.isTransitioning || this.isFinishing) {
      console.log("QueueManager: Skipping onTrackFinished because player is resolving/transitioning/finishing");
      return;
    }

    this.isFinishing = true;

    try {
      const { usePlayerStore } = require("../store/playerStore");
      const store = usePlayerStore.getState();
      const currentSong = this.queue[this.index];
      if (!currentSong) return;

      console.log("QueueManager: onTrackFinished called for song:", currentSong.title, currentSong.id);

      if (this.currentlyPlayingId && this.currentlyPlayingId !== currentSong.id) {
        console.log("QueueManager: Skipping onTrackFinished because currentlyPlayingId doesn't match current song:", this.currentlyPlayingId, currentSong.id);
        return;
      }

      if (this.lastFinishedId === currentSong.id) {
        console.log("QueueManager: Skipping onTrackFinished because song already finished:", currentSong.id);
        return;
      }

      this.lastFinishedId = currentSong.id;

      if (store.repeat === "one") {
        this.loadIndex(this.index);
        return;
      }

      await this.playNext();
    } finally {
      setTimeout(() => {
        this.isFinishing = false;
      }, 500);
    }
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

    const uniqueCandidates = new Map<string, Song>();
    for (const c of candidatesPool) {
      const key = c.id || c.url || `${c.title.toLowerCase().trim()}|${c.artist.toLowerCase().trim()}`;
      if (!uniqueCandidates.has(key)) {
        uniqueCandidates.set(key, c);
      }
    }
    const candidates = Array.from(uniqueCandidates.values());

    const scoredCandidates = candidates
      .map(candidate => {
        const baseScore = this.scoreRecommendation(candidate, seedSong);
        if (baseScore === -Infinity) {
          return { song: candidate, score: -Infinity };
        }
        const score = baseScore + Math.random() * 5;
        return { song: candidate, score };
      })
      .filter(item => item.score > -Infinity && item.song.id !== seedSong.id);

    scoredCandidates.sort((a, b) => b.score - a.score);

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
    if (this.isResolving) return;
    
    console.log(`QueueManager: Building recommendations seeded by: ${seedSong.title}`);
    const recommendations = await this.buildArtistQueue(seedSong);
    
    if (recommendations.length > 0) {
      this.queue = [...this.queue, ...recommendations];
      console.log(`QueueManager: Appended ${recommendations.length} songs.`);
      this.syncWithZustand();
      this.saveQueueImmediately();
    }
  }

  public async appendRecommendedSongsIfNeeded() {
    if (this.isResolving || this.isFetchingRelated) return;

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
      const normTitle = this.normalizeSongTitle(s.title);
      const artistPart = this.extractPrimaryArtist(s).toLowerCase().trim();
      const key = `${normTitle}|${artistPart}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    }
    return Array.from(uniqueMap.values());
  }

  private isDuplicate(s1: Song, s2: Song): boolean {
    if (s1.id === s2.id) return true;
    const t1 = this.normalizeSongTitle(s1.title);
    const t2 = this.normalizeSongTitle(s2.title);
    const a1 = this.extractPrimaryArtist(s1).toLowerCase().trim();
    const a2 = this.extractPrimaryArtist(s2).toLowerCase().trim();
    return t1 === t2 && a1 === a2;
  }
}
