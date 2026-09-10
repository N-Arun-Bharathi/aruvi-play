import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useLikedStore } from "../store/likedStore";
import { usePlaylistStore } from "../store/playlistStore";
import { useHistoryStore } from "../store/historyStore";
import { usePlayerStore } from "../store/playerStore";
import { SongListRow } from "../components/SongListRow";
import { SongCard } from "../components/SongCard";
import { Heart, ListMusic, History, Plus, Play, Shuffle, Lock, Sparkles, Trash2 } from "lucide-react";

interface LibraryViewProps {
  initialTab?: "liked" | "playlists" | "history";
  setActiveView?: (view: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ initialTab = "liked", setActiveView }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL path
  const getTabFromPath = (): "liked" | "playlists" | "history" => {
    if (location.pathname.includes("playlists")) return "playlists";
    if (location.pathname.includes("history")) return "history";
    return "liked";
  };

  const { authMode, openAuthModal } = useAuthStore();
  const { likedSongs, hydrate: hydrateLiked } = useLikedStore();
  const { playlists, createPlaylist, setActivePlaylist } = usePlaylistStore();
  const { history, clearHistory } = useHistoryStore();
  const { playSong } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<"liked" | "playlists" | "history">(getTabFromPath());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlName, setNewPlName] = useState("");
  const [newPlDesc, setNewPlDesc] = useState("");

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  useEffect(() => {
    hydrateLiked();
  }, []);

  const handleTabChange = (tab: "liked" | "playlists" | "history") => {
    setActiveTab(tab);
    navigate(`/library/${tab}`);
    if (setActiveView) setActiveView(tab);
  };

  const playAllLiked = (shuffle = false) => {
    if (!likedSongs.length) return;
    if (shuffle) {
      const list = [...likedSongs].sort(() => Math.random() - 0.5);
      playSong(list[0], list);
    } else {
      playSong(likedSongs[0], likedSongs);
    }
  };

  const playAllHistory = (shuffle = false) => {
    const list = history.map((h) => h.song);
    if (!list.length) return;
    if (shuffle) {
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    } else {
      playSong(list[0], list);
    }
  };

  const isGuest = authMode === "guest";

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    const pl = createPlaylist(newPlName, newPlDesc);
    setNewPlName("");
    setNewPlDesc("");
    setShowCreateModal(false);
    if (pl && pl.id) {
      navigate(`/playlist/${pl.id}`);
    }
  };

  if (isGuest) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center my-16 space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Your Personal Music Library</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Sign in or create a free account to save your favorite songs, create custom playlists, and view your listening history across web and mobile.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => openAuthModal("login")}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-full shadow-lg transition-all"
          >
            Log In
          </button>
          <button
            onClick={() => openAuthModal("register")}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-full border border-zinc-700 transition-colors"
          >
            Register Free
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Header Tabs */}
      <div className="flex items-center justify-between">
        {/* Tab Navigation Row */}
        <div className="flex items-center gap-3 border-b border-zinc-850 pb-4 overflow-x-auto w-full">
          <button
            onClick={() => handleTabChange("liked")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "liked"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${activeTab === "liked" ? "fill-current" : ""}`} />
            <span>Liked Songs ({likedSongs.length})</span>
          </button>

          <button
            onClick={() => handleTabChange("playlists")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "playlists"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Playlists ({playlists.length})</span>
          </button>

          <button
            onClick={() => handleTabChange("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "history"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* LIKED SONGS TAB */}
      {activeTab === "liked" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">Liked Songs</h2>
              <p className="text-xs text-zinc-400">{likedSongs.length} tracks saved to your library</p>
            </div>

            {likedSongs.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => playAllLiked(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold text-xs rounded-full shadow-lg shadow-cyan-400/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-zinc-950" /> Play All
                </button>
                <button
                  onClick={() => playAllLiked(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/30 text-zinc-200 hover:text-white font-bold text-xs rounded-full transition-all hover:scale-105 active:scale-95 shadow-md"
                  title="Shuffle Liked Songs"
                >
                  <Shuffle className="w-4 h-4 text-cyan-400" /> Shuffle
                </button>
              </div>
            )}
          </div>

          {likedSongs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl space-y-2">
              <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No liked songs yet</h3>
              <p className="text-xs text-zinc-400">Click the heart icon on any song to save it to your library!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {likedSongs.map((song, idx) => (
                <SongListRow key={song.id} song={song} index={idx} queue={likedSongs} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLAYLISTS TAB */}
      {activeTab === "playlists" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Your Playlists</h2>
              <p className="text-xs text-zinc-400">Custom music mixes created by you</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" /> Create Playlist
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => {
                  setActivePlaylist(pl);
                  navigate(`/playlist/${pl.id}`);
                  if (setActiveView) setActiveView("playlist-detail");
                }}
                className="group bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-cyan-500/40 rounded-3xl p-4 cursor-pointer transition-all hover:scale-[1.02] shadow-xl"
              >
                <img
                  src={pl.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"}
                  alt={pl.name}
                  className="w-full aspect-square rounded-2xl object-cover mb-3 bg-zinc-800"
                />
                <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                  {pl.name}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">{pl.songs?.length || 0} songs</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">Listening History</h2>
              <p className="text-xs text-zinc-400">Recently played tracks on this device</p>
            </div>

            {history.length > 0 && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => playAllHistory(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold text-xs rounded-full shadow-lg shadow-cyan-400/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-zinc-950" /> Play All
                </button>
                <button
                  onClick={() => playAllHistory(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/30 text-zinc-200 hover:text-white font-bold text-xs rounded-full transition-all hover:scale-105 active:scale-95 shadow-md"
                  title="Shuffle History"
                >
                  <Shuffle className="w-4 h-4 text-cyan-400" /> Shuffle
                </button>
                <button
                  onClick={clearHistory}
                  className="p-2.5 text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-full transition-colors"
                  title="Clear Listening History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl space-y-2">
              <History className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No listening history yet</h3>
              <p className="text-xs text-zinc-400">Songs you play will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((item, idx) => (
                <SongListRow key={item.id} song={item.song} index={idx} queue={history.map((h) => h.song)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white">Create New Playlist</h3>
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Playlist Name</label>
                <input
                  type="text"
                  required
                  value={newPlName}
                  onChange={(e) => setNewPlName(e.target.value)}
                  placeholder="My Party Bangers"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description (optional)</label>
                <textarea
                  value={newPlDesc}
                  onChange={(e) => setNewPlDesc(e.target.value)}
                  placeholder="High energy Tamil dance tracks..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 h-20 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
