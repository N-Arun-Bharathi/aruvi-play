import * as SQLite from "expo-sqlite";
import { Song } from "../types/song";

// Open the SQLite database connection
let db: SQLite.SQLiteDatabase;
try {
  db = SQLite.openDatabaseSync("aruvi_play.db");
} catch (e) {
  console.error("Failed to open SQLite database", e);
}

// Re-usable helper to parse array of strings
function parseArtists(artistsStr: string | null): string[] {
  if (!artistsStr) return [];
  return artistsStr.split(/[;,]/).map(a => a.trim()).filter(Boolean);
}

export function initLocalDatabase() {
  if (!db) return;

  console.log("SQLite: Running database initialization and migration check...");

  try {
    // Drop old deprecated tables if they exist with conflicting definitions
    db.execSync(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS queue_items;
      DROP TABLE IF EXISTS queue;
      DROP TABLE IF EXISTS liked_songs;
      DROP TABLE IF EXISTS playlist_songs;
      DROP TABLE IF EXISTS playlists;
      DROP TABLE IF EXISTS listening_history;
      DROP TABLE IF EXISTS search_history;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS songs_metadata;
      PRAGMA foreign_keys = ON;
    `);
  } catch (e) {
    console.warn("SQLite: Clear old schemas warning:", e);
  }

  // Schema creation
  db.execSync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      phone TEXT,
      email TEXT,
      display_name TEXT,
      avatar_url TEXT,
      preferred_language TEXT DEFAULT 'tamil',
      theme TEXT DEFAULT 'dark',
      is_owner INTEGER DEFAULT 0,
      initial_likes_imported INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_active_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      normalized_title TEXT NOT NULL,
      artist TEXT,
      primary_artist TEXT,
      music_director TEXT,
      album TEXT,
      movie TEXT,
      language TEXT,
      genre TEXT,
      mood TEXT,
      energy TEXT,
      artwork_url TEXT,
      duration_seconds INTEGER,
      release_year INTEGER,
      source_type TEXT DEFAULT 'online',
      source_id TEXT,
      source_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS liked_songs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      liked_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
      UNIQUE (user_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      id TEXT PRIMARY KEY,
      playlist_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      added_at TEXT DEFAULT (datetime('now')),
      added_by TEXT,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
      UNIQUE (playlist_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS listening_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      played_at TEXT DEFAULT (datetime('now')),
      completed_percentage REAL DEFAULT 0.0,
      source_type TEXT,
      source_id TEXT,
      device_id TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playback_sessions (
      user_id TEXT PRIMARY KEY,
      current_song_id TEXT,
      position_seconds REAL DEFAULT 0.0,
      is_playing INTEGER DEFAULT 0,
      repeat_mode TEXT DEFAULT 'off',
      shuffle_enabled INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (current_song_id) REFERENCES songs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_queues (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      current_index INTEGER DEFAULT -1,
      source_type TEXT,
      source_id TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS queue_items (
      id TEXT PRIMARY KEY,
      queue_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      queue_type TEXT DEFAULT 'manual',
      added_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (queue_id) REFERENCES user_queues(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      query TEXT NOT NULL,
      selected_song_id TEXT,
      searched_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (selected_song_id) REFERENCES songs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS downloads (
      song_id TEXT PRIMARY KEY,
      local_uri TEXT NOT NULL,
      downloaded_at TEXT DEFAULT (datetime('now')),
      file_size INTEGER DEFAULT 0,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_sync_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log("SQLite: Database initialization completed successfully.");
}

// Automatically trigger migrations on import
try {
  initLocalDatabase();
} catch (e) {
  console.error("Failed running database migrations", e);
}

// -------------------------------------------------------------
// HELPER MAPPER
// -------------------------------------------------------------
function mapRowToSong(row: any): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist || "Unknown",
    album: row.album || undefined,
    artwork: row.artwork_url || undefined,
    url: row.source_url || "",
    duration: row.duration_seconds || undefined,
    source: row.source_type === "local" ? "local" : "online",
    primaryArtists: row.primary_artist || undefined,
    primaryArtist: row.primary_artist || undefined,
    artists: parseArtists(row.artist),
    musicDirector: row.music_director || undefined,
    language: row.language || undefined,
    genre: row.genre || undefined,
    mood: row.mood || undefined,
    energy: row.energy || undefined
  };
}

// -------------------------------------------------------------
// PROFILE / USER OPERATIONS
// -------------------------------------------------------------
export async function dbSaveUser(user: {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  preferred_language?: string;
  theme?: string;
  is_owner?: boolean;
  initial_likes_imported?: boolean;
}): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO profiles (
      id, phone, email, display_name, avatar_url, preferred_language, theme, is_owner, initial_likes_imported
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      phone = COALESCE(excluded.phone, phone),
      email = COALESCE(excluded.email, email),
      display_name = COALESCE(excluded.display_name, display_name),
      avatar_url = COALESCE(excluded.avatar_url, avatar_url),
      preferred_language = COALESCE(excluded.preferred_language, preferred_language),
      theme = COALESCE(excluded.theme, theme),
      is_owner = COALESCE(excluded.is_owner, is_owner),
      initial_likes_imported = COALESCE(excluded.initial_likes_imported, initial_likes_imported),
      last_active_at = datetime('now'),
      updated_at = datetime('now');
  `;
  await db.runAsync(sql, [
    user.id,
    user.phone || null,
    user.email || null,
    user.name || null,
    user.avatar_url || null,
    user.preferred_language || "tamil",
    user.theme || "dark",
    user.is_owner ? 1 : 0,
    user.initial_likes_imported ? 1 : 0
  ]);
}

export async function dbGetUser(id: string): Promise<any | null> {
  if (!db) return null;
  const row = await db.getFirstAsync("SELECT * FROM profiles WHERE id = ?", [id]);
  return row || null;
}

// -------------------------------------------------------------
// SONGS METADATA OPERATIONS
// -------------------------------------------------------------
export async function dbSaveSongMetadata(song: Song): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO songs (
      id, title, normalized_title, artist, primary_artist, music_director,
      album, language, genre, mood, energy, artwork_url, duration_seconds, source_type, source_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      normalized_title = excluded.normalized_title,
      artist = excluded.artist,
      primary_artist = excluded.primary_artist,
      music_director = excluded.music_director,
      album = excluded.album,
      language = excluded.language,
      genre = excluded.genre,
      mood = excluded.mood,
      energy = excluded.energy,
      artwork_url = excluded.artwork_url,
      duration_seconds = excluded.duration_seconds,
      source_type = excluded.source_type,
      source_url = COALESCE(excluded.source_url, source_url);
  `;
  await db.runAsync(sql, [
    song.id,
    song.title,
    song.normalized_title || song.title.toLowerCase().trim(),
    song.artist,
    song.primaryArtist || null,
    song.musicDirector || null,
    song.album || null,
    song.language || null,
    song.genre || null,
    song.mood || null,
    song.energy || null,
    song.artwork || null,
    song.duration || null,
    song.source || "online",
    song.url || null
  ]);
}

// -------------------------------------------------------------
// LIKED SONGS OPERATIONS
// -------------------------------------------------------------
export async function dbSaveLikedSong(userId: string, song: Song): Promise<void> {
  if (!db) return;
  await dbSaveSongMetadata(song);
  
  const id = `${userId}_${song.id}`;
  const sql = `INSERT OR IGNORE INTO liked_songs (id, user_id, song_id) VALUES (?, ?, ?)`;
  await db.runAsync(sql, [id, userId, song.id]);
}

export async function dbRemoveLikedSong(userId: string, songId: string): Promise<void> {
  if (!db) return;
  const sql = `DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?`;
  await db.runAsync(sql, [userId, songId]);
}

export async function dbGetLikedSongs(userId: string): Promise<Song[]> {
  if (!db) return [];
  const rows = await db.getAllAsync(`
    SELECT s.* FROM songs s
    JOIN liked_songs ls ON ls.song_id = s.id
    WHERE ls.user_id = ?
    ORDER BY ls.liked_at DESC
  `, [userId]);
  return rows.map(mapRowToSong);
}

// -------------------------------------------------------------
// PLAYLISTS OPERATIONS
// -------------------------------------------------------------
export async function dbSavePlaylist(playlist: {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
}): Promise<void> {
  if (!db) return;
  const sql = `
    INSERT INTO playlists (id, user_id, name, description, cover_url, is_public)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      cover_url = excluded.cover_url,
      is_public = excluded.is_public,
      updated_at = datetime('now');
  `;
  await db.runAsync(sql, [
    playlist.id,
    playlist.userId,
    playlist.name,
    playlist.description || null,
    playlist.coverImage || null,
    playlist.isPublic ? 1 : 0
  ]);
}

export async function dbDeletePlaylist(playlistId: string): Promise<void> {
  if (!db) return;
  await db.runAsync("DELETE FROM playlists WHERE id = ?", [playlistId]);
}

export async function dbGetPlaylists(userId: string): Promise<any[]> {
  if (!db) return [];
  return await db.getAllAsync("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC", [userId]);
}

export async function dbAddSongToPlaylist(playlistId: string, song: Song, position: number): Promise<void> {
  if (!db) return;
  await dbSaveSongMetadata(song);
  
  const id = `${playlistId}_${song.id}`;
  const sql = `
    INSERT INTO playlist_songs (id, playlist_id, song_id, position)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(playlist_id, song_id) DO UPDATE SET
      position = excluded.position;
  `;
  await db.runAsync(sql, [id, playlistId, song.id, position]);
}

export async function dbRemoveSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  if (!db) return;
  await db.runAsync("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?", [playlistId, songId]);
}

export async function dbGetPlaylistSongs(playlistId: string): Promise<Song[]> {
  if (!db) return [];
  const rows = await db.getAllAsync(`
    SELECT s.* FROM songs s
    JOIN playlist_songs ps ON ps.song_id = s.id
    WHERE ps.playlist_id = ?
    ORDER BY ps.position ASC
  `, [playlistId]);
  return rows.map(mapRowToSong);
}

// -------------------------------------------------------------
// LISTENING HISTORY OPERATIONS
// -------------------------------------------------------------
export async function dbSaveHistory(
  userId: string,
  song: Song,
  listeningPercentage: number,
  source: string
): Promise<void> {
  if (!db) return;
  await dbSaveSongMetadata(song);
  
  const id = `${userId}_${song.id}_${Date.now()}`;
  const sql = `
    INSERT INTO listening_history (id, user_id, song_id, completed_percentage, source_type)
    VALUES (?, ?, ?, ?, ?);
  `;
  await db.runAsync(sql, [id, userId, song.id, listeningPercentage, source]);
}

export async function dbGetHistory(userId: string, limit = 30): Promise<Song[]> {
  if (!db) return [];
  const rows = await db.getAllAsync(`
    SELECT s.* FROM songs s
    JOIN (
      SELECT song_id, MAX(played_at) as max_played FROM listening_history
      WHERE user_id = ?
      GROUP BY song_id
    ) h ON h.song_id = s.id
    ORDER BY h.max_played DESC
    LIMIT ?
  `, [userId, limit]);
  return rows.map(mapRowToSong);
}

// -------------------------------------------------------------
// SEARCH HISTORY OPERATIONS
// -------------------------------------------------------------
export async function dbSaveSearchQuery(userId: string, query: string, selectedSong?: Song): Promise<void> {
  if (!db) return;
  if (selectedSong) {
    await dbSaveSongMetadata(selectedSong);
  }
  
  // Deduplicate
  await db.runAsync("DELETE FROM search_history WHERE user_id = ? AND LOWER(query) = LOWER(?)", [userId, query.trim()]);
  
  const id = `${userId}_${Date.now()}`;
  const sql = `
    INSERT INTO search_history (id, user_id, query, selected_song_id)
    VALUES (?, ?, ?, ?);
  `;
  await db.runAsync(sql, [id, userId, query.trim(), selectedSong ? selectedSong.id : null]);
}

export async function dbGetSearchQueries(userId: string, limit = 10): Promise<string[]> {
  if (!db) return [];
  const rows: any[] = await db.getAllAsync(`
    SELECT DISTINCT query FROM search_history
    WHERE user_id = ?
    ORDER BY searched_at DESC
    LIMIT ?
  `, [userId, limit]);
  return rows.map(r => r.query);
}

export async function dbClearSearchQuery(userId: string, query: string): Promise<void> {
  if (!db) return;
  await db.runAsync("DELETE FROM search_history WHERE user_id = ? AND LOWER(query) = LOWER(?)", [userId, query.trim()]);
}

export async function dbClearAllSearchHistory(userId: string): Promise<void> {
  if (!db) return;
  await db.runAsync("DELETE FROM search_history WHERE user_id = ?", [userId]);
}

// -------------------------------------------------------------
// QUEUE & PLAYBACK SESSION OPERATIONS
// -------------------------------------------------------------
export async function dbSaveQueue(userId: string, queueId: string, index: number, songsList: Song[]): Promise<void> {
  if (!db) return;
  
  // 1. Create or update user_queues entry
  await db.runAsync(`
    INSERT INTO user_queues (id, user_id, current_index)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      current_index = excluded.current_index,
      updated_at = datetime('now');
  `, [queueId, userId, index]);

  // 2. Clear old items
  await db.runAsync("DELETE FROM queue_items WHERE queue_id = ?", [queueId]);

  // 3. Insert new queue items
  for (let i = 0; i < songsList.length; i++) {
    const s = songsList[i];
    await dbSaveSongMetadata(s);
    
    const itemId = `${queueId}_${s.id}_${i}`;
    await db.runAsync(`
      INSERT INTO queue_items (id, queue_id, song_id, position, queue_type)
      VALUES (?, ?, ?, ?, ?);
    `, [itemId, queueId, s.id, i, s.source === "local" ? "local" : "online"]);
  }
}

export async function dbGetQueue(userId: string): Promise<{ queueId: string, index: number, songs: Song[] } | null> {
  if (!db) return null;
  
  const qRow: any = await db.getFirstAsync("SELECT * FROM user_queues WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1", [userId]);
  if (!qRow) return null;

  const items: any[] = await db.getAllAsync(`
    SELECT s.*, qi.queue_type FROM songs s
    JOIN queue_items qi ON qi.song_id = s.id
    WHERE qi.queue_id = ?
    ORDER BY qi.position ASC
  `, [qRow.id]);

  const songs = items.map(row => {
    const s = mapRowToSong(row);
    if (row.queue_type === "local") {
      s.source = "local";
    }
    return s;
  });

  return {
    queueId: qRow.id,
    index: qRow.current_index,
    songs
  };
}

// Playback session synchronization
export async function dbSavePlaybackSession(session: {
  userId: string;
  currentSongId: string | null;
  positionSeconds: number;
  isPlaying: boolean;
  repeatMode: string;
  shuffleEnabled: boolean;
}): Promise<void> {
  if (!db) return;
  
  const sql = `
    INSERT INTO playback_sessions (
      user_id, current_song_id, position_seconds, is_playing, repeat_mode, shuffle_enabled
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      current_song_id = excluded.current_song_id,
      position_seconds = excluded.position_seconds,
      is_playing = excluded.is_playing,
      repeat_mode = excluded.repeat_mode,
      shuffle_enabled = excluded.shuffle_enabled,
      updated_at = datetime('now');
  `;
  await db.runAsync(sql, [
    session.userId,
    session.currentSongId,
    session.positionSeconds,
    session.isPlaying ? 1 : 0,
    session.repeatMode,
    session.shuffleEnabled ? 1 : 0
  ]);
}

export async function dbGetPlaybackSession(userId: string): Promise<any | null> {
  if (!db) return null;
  const row = await db.getFirstAsync("SELECT * FROM playback_sessions WHERE user_id = ?", [userId]);
  return row || null;
}
