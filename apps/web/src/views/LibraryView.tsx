import React, { useState, useEffect } from "react";
import { SaavnPlaylist, getFeaturedPlaylists } from "@aruvi/shared";
import { useAuthStore } from "../store/authStore";
import { useLikedStore } from "../store/likedStore";
import { usePlaylistStore } from "../store/playlistStore";
import { useSettingsStore } from "../store/settingsStore";
import { useHistoryStore } from "../store/historyStore";
import { useInsightsStore } from "../store/insightsStore";
import { usePlayerStore } from "../store/playerStore";
import { SongListRow } from "../components/SongListRow";
import {
  Heart,
  ListMusic,
  History,
  Plus,
  Play,
  Lock,
  Sparkles,
  Trash2,
  BarChart3,
  Flame,
  Clock,
  Music,
  User,
} from "lucide-react";

interface LibraryViewProps {
  initialTab?: "liked" | "playlists" | "history" | "insights";
  setActiveView: (view: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ initialTab = "liked", setActiveView }) => {
  const { authMode, openAuthModal } = useAuthStore();
  const { likedSongs } = useLikedStore();
  const { playlists, createPlaylist } = usePlaylistStore();
  const { preferredLanguage } = useSettingsStore();
  const { history, clearHistory } = useHistoryStore();
  const { stats, loadStats } = useInsightsStore();
  const { playSong } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<"liked" | "playlists" | "history" | "insights">(initialTab);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlName, setNewPlName] = useState("");
  const [newPlDesc, setNewPlDesc] = useState("");

  const [saavnPlaylists, setSaavnPlaylists] = useState<SaavnPlaylist[]>([]);
  const [loadingSaavn, setLoadingSaavn] = useState(false);

  const isGuest = authMode === "guest";
  const activeLang = (preferredLanguage || "Tamil").toLowerCase();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === "playlists") {
      setLoadingSaavn(true);
      getFeaturedPlaylists([activeLang])
        .then((res) => setSaavnPlaylists(res || []))
        .catch((err) => console.warn("Failed to load Saavn playlists:", err))
        .finally(() => setLoadingSaavn(false));
    }
  }, [activeTab, activeLang]);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    createPlaylist(newPlName, newPlDesc);
    setNewPlName("");
    setNewPlDesc("");
    setShowCreateModal(false);
  };

  const handleOpenSaavnPlaylist = (id: string) => {
    setActiveView(`/playlists/${id}`);
  };

  const renderGuestPrompt = (title: string, description: string) => (
    <div className="p-8 max-w-2xl mx-auto text-center my-12 space-y-6 bg-slate-800/60 border border-white/15 backdrop-blur-xl rounded-3xl shadow-xl">
      <div className="w-16 h-16 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/30 shadow-lg shadow-sky-500/10">
        <Lock className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={() => openAuthModal("login")}
          className="px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs rounded-full shadow-lg shadow-sky-500/30 transition-all"
        >
          Log In
        </button>
        <button
          onClick={() => openAuthModal("register")}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-full border border-white/15 transition-colors"
        >
          Register Free
        </button>
      </div>
    </div>
  );

  const totalMinutes = Math.round((stats.totalListeningSeconds || 0) / 60);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Header Tabs */}
      <div className="flex items-center justify-between overflow-x-auto custom-scrollbar pb-2">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 w-full min-w-max">
          <button
            onClick={() => setActiveTab("liked")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "liked"
                ? "bg-gradient-to-r from-sky-500/20 to-blue-600/10 text-sky-400 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Heart className="w-4 h-4" /> Liked Songs ({isGuest ? 0 : likedSongs.length})
          </button>
          <button
            onClick={() => setActiveTab("playlists")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "playlists"
                ? "bg-gradient-to-r from-sky-500/20 to-blue-600/10 text-sky-400 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ListMusic className="w-4 h-4" /> Playlists ({isGuest ? saavnPlaylists.length : playlists.length + saavnPlaylists.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-gradient-to-r from-sky-500/20 to-blue-600/10 text-sky-400 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" /> History ({isGuest ? 0 : history.length})
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "insights"
                ? "bg-gradient-to-r from-sky-500/20 to-blue-600/10 text-sky-400 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Wrapped & Insights
          </button>
        </div>
      </div>

      {/* LIKED SONGS TAB */}
      {activeTab === "liked" && (
        isGuest ? (
          renderGuestPrompt(
            "Save Your Favorite Songs",
            "Sign in or create a free account to save your favorite songs and access them across all your devices."
          )
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Liked Songs</h2>
                <p className="text-xs text-slate-400">{likedSongs.length} tracks saved to your library</p>
              </div>
            </div>

            {likedSongs.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/15 rounded-3xl space-y-2 bg-slate-800/40 backdrop-blur-xl">
                <Heart className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No liked songs yet</h3>
                <p className="text-xs text-slate-400">Click the heart icon on any song to save it to your library!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {likedSongs.map((song, idx) => (
                  <SongListRow key={song.id} song={song} index={idx} queue={likedSongs} />
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* PLAYLISTS TAB */}
      {activeTab === "playlists" && (
        <div className="space-y-10 animate-fade-in">
          {/* Custom Playlists */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Your Custom Playlists</h2>
                <p className="text-xs text-slate-400">Personal mixes created by you</p>
              </div>
              <button
                onClick={() => {
                  if (isGuest) {
                    openAuthModal("register");
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all"
              >
                <Plus className="w-4 h-4" /> Create Playlist
              </button>
            </div>

            {playlists.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/15 rounded-2xl text-slate-400 text-xs bg-slate-800/40 backdrop-blur-xl">
                {isGuest
                  ? "Sign in to build and save your own custom playlists."
                  : "No custom playlists created yet. Click \"Create Playlist\" above to start!"}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => {
                      usePlaylistStore.getState().setActivePlaylist(pl);
                      setActiveView(`/playlists/${pl.id}`);
                    }}
                    className="group p-4 bg-slate-800/60 hover:bg-slate-800/90 border border-white/[0.08] hover:border-sky-400/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-xl flex flex-col justify-between backdrop-blur-xl"
                  >
                    <img
                      src={pl.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"}
                      alt={pl.name}
                      className="w-full aspect-square rounded-xl object-cover mb-3 shadow-inner"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-sky-400 truncate">{pl.name}</h3>
                      <p className="text-xs text-slate-400 truncate">{pl.songs.length} songs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JioSaavn Curated Playlists */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-400" /> Featured JioSaavn Playlists
                </h2>
                <p className="text-xs text-slate-400">
                  Trending {activeLang.toUpperCase()} & global charts directly from JioSaavn
                </p>
              </div>
            </div>

            {loadingSaavn ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 bg-slate-800/40 border border-white/[0.06] rounded-2xl animate-pulse space-y-3">
                    <div className="w-full aspect-square bg-slate-800 rounded-xl" />
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {saavnPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => handleOpenSaavnPlaylist(pl.id)}
                    className="group p-4 bg-slate-800/60 hover:bg-slate-800/90 border border-white/[0.08] hover:border-sky-400/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-xl flex flex-col justify-between relative overflow-hidden backdrop-blur-xl"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-slate-900">
                      <img
                        src={pl.image || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4"}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {pl.songCount && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 border border-white/10 text-[10px] font-bold text-white">
                          {pl.songCount} Tracks
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-sky-400 truncate">{pl.title}</h3>
                      <p className="text-xs text-slate-400 truncate">{pl.subtitle || "JioSaavn Official"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Listening History</h2>
              <p className="text-xs text-slate-400">Recently played tracks on this device</p>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/15 rounded-3xl space-y-2 bg-slate-800/40 backdrop-blur-xl">
              <History className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No history yet</h3>
              <p className="text-xs text-slate-400">Songs you play will automatically appear here.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((item, idx) => (
                <SongListRow
                  key={item.id}
                  song={item.song}
                  index={idx}
                  queue={history.map((h) => h.song)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* INSIGHTS & WRAPPED TAB */}
      {activeTab === "insights" && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-sky-400" /> Aruvi Wrapped & Insights
            </h2>
            <p className="text-xs text-slate-400">Your personal taste profile and top listening stats</p>
          </div>

          {/* Persona Card */}
          <div className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-br ${stats.musicPersona.gradient} text-white shadow-2xl relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-4 mb-3">
              <span className="text-4xl">{stats.musicPersona.icon}</span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-200">
                  Your Music Identity
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">{stats.musicPersona.title}</h3>
              </div>
            </div>
            <p className="text-sm text-sky-100/90 font-medium leading-relaxed max-w-2xl">
              {stats.musicPersona.description}
            </p>
          </div>

          {/* Stats Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900/75 border border-slate-800/80 text-center space-y-1 shadow-xl backdrop-blur-xl">
              <Clock className="w-5 h-5 text-sky-400 mx-auto" />
              <div className="text-2xl font-black text-white">{totalHours} hrs</div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Listening Time</div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/75 border border-slate-800/80 text-center space-y-1 shadow-xl backdrop-blur-xl">
              <Music className="w-5 h-5 text-blue-400 mx-auto" />
              <div className="text-2xl font-black text-white">{stats.totalPlays || 0}</div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Songs Played</div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/75 border border-slate-800/80 text-center space-y-1 shadow-xl backdrop-blur-xl">
              <Flame className="w-5 h-5 text-amber-400 mx-auto" />
              <div className="text-2xl font-black text-white">{stats.streakDays || 1} days</div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Active Daily Streak</div>
            </div>
          </div>

          {/* Top Songs */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" /> Your Top Played Songs
            </h3>

            {stats.topSongs.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-slate-800 rounded-3xl text-slate-400 text-xs">
                Listen to more songs to unlock your top tracks leaderboard!
              </div>
            ) : (
              <div className="space-y-1.5">
                {stats.topSongs.slice(0, 10).map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      playSong({
                        id: item.id,
                        title: item.title,
                        artist: item.artist,
                        artwork: item.artwork,
                        album: item.album,
                        language: item.language,
                        url: "",
                        source: "online",
                      })
                    }
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-sky-400/40 cursor-pointer transition-all group backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center font-mono font-black text-xs text-sky-400">
                        #{idx + 1}
                      </span>
                      <img
                        src={item.artwork || "/aruvi-play.png"}
                        alt={item.title}
                        className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{item.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-slate-400 font-mono font-semibold">
                        {item.playCount} {item.playCount === 1 ? "play" : "plays"}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-sky-500 text-slate-300 group-hover:text-slate-950 flex items-center justify-center transition-colors">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-black text-white">Create New Playlist</h2>
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Playlist Name</label>
                <input
                  type="text"
                  required
                  value={newPlName}
                  onChange={(e) => setNewPlName(e.target.value)}
                  placeholder="e.g. Late Night Drives"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Description (Optional)</label>
                <textarea
                  value={newPlDesc}
                  onChange={(e) => setNewPlDesc(e.target.value)}
                  placeholder="Tell us what this mix is about..."
                  className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-sky-500 h-20 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
