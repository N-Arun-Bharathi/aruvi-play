import { create } from "zustand";
import { Song, Playlist } from "@aruvi/shared";
import { useToastStore } from "./toastStore";

interface PlaylistState {
  playlists: Playlist[];
  activePlaylist: Playlist | null;
  loadPlaylists: () => void;
  createPlaylist: (name: string, description?: string, coverUrl?: string, isPublic?: boolean) => Playlist;
  editPlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  setActivePlaylist: (playlist: Playlist | null) => void;
}

const STORAGE_KEY = "aruvi_user_playlists";

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  activePlaylist: null,

  loadPlaylists: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ playlists: JSON.parse(stored) });
      } else {
        // Create initial default playlist
        const defaultPl: Playlist = {
          id: "pl_favorites_mix",
          name: "My Chill Favorites",
          description: "Curated mix of favorite beats and melodies",
          cover_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80",
          is_public: true,
          songs: [],
          created_at: new Date().toISOString(),
        };
        set({ playlists: [defaultPl] });
        localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultPl]));
      }
    } catch (e) {
      console.warn("Failed to load playlists:", e);
    }
  },

  createPlaylist: (name, description = "", coverUrl, isPublic = true) => {
    const toast = useToastStore.getState();
    const newPl: Playlist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || "Untitled Playlist",
      description: description.trim(),
      cover_url: coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80",
      is_public: isPublic,
      songs: [],
      created_at: new Date().toISOString(),
    };

    const updated = [newPl, ...get().playlists];
    set({ playlists: updated, activePlaylist: newPl });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast.show(`Playlist "${newPl.name}" created!`, "success");
    return newPl;
  },

  editPlaylist: (id, updates) => {
    const toast = useToastStore.getState();
    const updated = get().playlists.map((pl) => (pl.id === id ? { ...pl, ...updates } : pl));
    set({ playlists: updated });
    if (get().activePlaylist?.id === id) {
      set({ activePlaylist: { ...get().activePlaylist!, ...updates } });
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast.show("Playlist updated!", "success");
  },

  deletePlaylist: (id) => {
    const toast = useToastStore.getState();
    const target = get().playlists.find((p) => p.id === id);
    const updated = get().playlists.filter((p) => p.id !== id);
    set({ playlists: updated });
    if (get().activePlaylist?.id === id) {
      set({ activePlaylist: null });
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast.show(`Playlist "${target?.name || ''}" deleted.`);
  },

  addSongToPlaylist: (playlistId, song) => {
    const toast = useToastStore.getState();
    const playlists = get().playlists;
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;

    if (pl.songs.some((s) => s.id === song.id)) {
      toast.show(`"${song.title}" is already in ${pl.name}`);
      return;
    }

    const updatedSongs = [...pl.songs, song];
    const updated = playlists.map((p) => (p.id === playlistId ? { ...p, songs: updatedSongs } : p));

    set({ playlists: updated });
    if (get().activePlaylist?.id === playlistId) {
      set({ activePlaylist: { ...pl, songs: updatedSongs } });
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast.show(`Added "${song.title}" to ${pl.name}`, "success");
  },

  removeSongFromPlaylist: (playlistId, songId) => {
    const toast = useToastStore.getState();
    const playlists = get().playlists;
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;

    const updatedSongs = pl.songs.filter((s) => s.id !== songId);
    const updated = playlists.map((p) => (p.id === playlistId ? { ...p, songs: updatedSongs } : p));

    set({ playlists: updated });
    if (get().activePlaylist?.id === playlistId) {
      set({ activePlaylist: { ...pl, songs: updatedSongs } });
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
    toast.show("Removed song from playlist.");
  },

  setActivePlaylist: (playlist) => set({ activePlaylist: playlist }),
}));
