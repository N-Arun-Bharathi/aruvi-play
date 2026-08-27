import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useLikedStore } from "../store/likedStore";
import { usePlaylistStore } from "../store/playlistStore";
import { useHistoryStore } from "../store/historyStore";
import { SongListRow } from "../components/SongListRow";
import { SongCard } from "../components/SongCard";
import { Heart, ListMusic, History, Plus, Play, Shuffle, Lock, Sparkles, Trash2 } from "lucide-react";

interface LibraryViewProps {
  initialTab?: "liked" | "playlists" | "history";
  setActiveView: (view: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ initialTab = "liked", setActiveView }) => {
  const { authMode, openAuthModal } = useAuthStore();
  const { likedSongs } = useLikedStore();
  const { playlists, createPlaylist } = usePlaylistStore();
  const { history, clearHistory } = useHistoryStore();

  const [activeTab, setActiveTab] = useState<"liked" | "playlists" | "history">(initialTab);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlName, setNewPlName] = useState("");
  const [newPlDesc, setNewPlDesc] = useState("");

  const isGuest = authMode === "guest";

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    createPlaylist(newPlName, newPlDesc);
    setNewPlName("");
    setNewPlDesc("");
    setShowCreateModal(false);
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
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 w-full">
          <button
            onClick={() => setActiveTab("liked")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "liked"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Heart className="w-4 h-4" /> Liked Songs ({likedSongs.length})
          </button>
          <button
            onClick={() => setActiveTab("playlists")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "playlists"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ListMusic className="w-4 h-4" /> Playlists ({playlists.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" /> History ({history.length})
          </button>
        </div>
      </div>

      {/* LIKED SONGS TAB */}
      {activeTab === "liked" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Liked Songs</h2>
              <p className="text-xs text-zinc-400">{likedSongs.length} tracks saved to your library</p>
            </div>
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
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Create Playlist
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => {
                  usePlaylistStore.getState().setActivePlaylist(pl);
                  setActiveView("playlist-detail");
                }}
                className="group p-4 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between"
              >
                <img
                  src={pl.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"}
                  alt={pl.name}
                  className="w-full aspect-square rounded-xl object-cover mb-3"
                />
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 truncate">{pl.name}</h3>
                  <p className="text-xs text-zinc-400 truncate">{pl.songs.length} songs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Listening History</h2>
              <p className="text-xs text-zinc-400">Recently played tracks</p>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-rose-400 bg-zinc-900 border border-zinc-800 rounded-xl transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
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
