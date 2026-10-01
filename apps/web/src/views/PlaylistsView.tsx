import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SaavnPlaylist,
  searchPlaylistsPaged,
} from "@aruvi/shared";
import { usePlaylistStore } from "../store/playlistStore";
import { useSettingsStore } from "../store/settingsStore";
import { usePlayerStore } from "../store/playerStore";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import {
  Search,
  Sparkles,
  Flame,
  Star,
  Disc,
  Music2,
  ListMusic,
  Plus,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Globe,
  Radio,
  FolderHeart,
  Layers,
  SlidersHorizontal,
  TrendingUp,
  Headphones,
  Check,
} from "lucide-react";

interface PlaylistsViewProps {
  setActiveView: (view: string) => void;
}

interface CategoryOption {
  id: string;
  label: string;
  icon: React.ElementType;
  querySuffix: string;
  gradient: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: "melodies", label: "Melodies & Romance", icon: Music2, querySuffix: "love melody hits", gradient: "from-pink-500 to-rose-500" },
  { id: "kuthu", label: "Party & Kuthu", icon: ZapIcon, querySuffix: "kuthu dance hits", gradient: "from-orange-500 to-amber-500" },
  { id: "chill", label: "Lo-Fi & Chill", icon: Headphones, querySuffix: "lofi chill acoustic", gradient: "from-teal-500 to-emerald-600" },
  { id: "classics", label: "Retro & 90s", icon: Clock, querySuffix: "90s 80s golden hits", gradient: "from-indigo-500 to-purple-600" },
  { id: "artists", label: "Artist Essentials", icon: Star, querySuffix: "best of hits", gradient: "from-blue-600 to-cyan-500" },
  { id: "devotional", label: "Devotional & Soul", icon: Sparkles, querySuffix: "devotional spiritual hits", gradient: "from-amber-500 to-orange-600" },
  { id: "workout", label: "Workout & Energy", icon: Flame, querySuffix: "workout motivation hits", gradient: "from-rose-500 to-red-600" },
];

function ZapIcon(props: any) {
  return <Flame {...props} />;
}

const POPULAR_LANGUAGES = [
  "Tamil",
  "Telugu",
  "Hindi",
  "Malayalam",
  "Kannada",
  "Punjabi",
  "English",
];

const POPULAR_TAGS = [
  "Anirudh Essentials",
  "AR Rahman Melodies",
  "Yuvan Drugs",
  "Ilaiyaraaja Magic",
  "Harris Jayaraj",
  "Midnight Lo-Fi",
  "Workout Energy",
  "Devotional",
  "90s Evergreens",
  "Acoustic Chill",
];

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({ setActiveView }) => {
  const { preferredLanguage, setPreferredLanguage } = useSettingsStore();
  const {
    playlists: customPlaylists,
    createPlaylist,
    loadSaavnPlaylist,
    setActivePlaylist,
  } = usePlaylistStore();
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { authMode, openAuthModal } = useAuthStore();
  const { show: showToast } = useToastStore();

  const isGuest = authMode === "guest";

  // Tab mode: 'discover' (JioSaavn) or 'library' (User custom playlists)
  const [activeTab, setActiveTab] = useState<"discover" | "library">("discover");
  const [activeCategory, setActiveCategory] = useState("melodies");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(
    preferredLanguage || "Tamil"
  );

  const [playlists, setPlaylists] = useState<SaavnPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickPlayingId, setQuickPlayingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const limit = 20;
  const [totalCount, setTotalCount] = useState(0);

  // Create Playlist Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlName, setNewPlName] = useState("");
  const [newPlDesc, setNewPlDesc] = useState("");

  const contentTopRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Keep selected language in sync if store updates
  useEffect(() => {
    if (preferredLanguage) {
      setSelectedLanguage(preferredLanguage);
    }
  }, [preferredLanguage]);

  // Fetch playlists handler
  const fetchPlaylists = useCallback(async () => {
    if (activeTab === "library") {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeLang = selectedLanguage.toLowerCase();

      // If user typed a search query
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase().includes(activeLang)
          ? debouncedSearch
          : `${activeLang} ${debouncedSearch}`;
        const res = await searchPlaylistsPaged(query, limit, page);
        setPlaylists(res.playlists);
        setTotalCount(res.total || res.playlists.length);
        return;
      }

      // Category playlist search
      const currentCat = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];
      const query = `${activeLang} ${currentCat.querySuffix}`;
      const res = await searchPlaylistsPaged(query, limit, page);
      setPlaylists(res.playlists);
      setTotalCount(res.total || res.playlists.length);
    } catch (err) {
      console.error("Failed to load playlists:", err);
      setPlaylists([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeCategory, debouncedSearch, selectedLanguage, page, limit]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleOpenSaavnPlaylist = (id: string) => {
    setActiveView(`/playlists/${id}`);
  };

  const handleQuickPlay = async (e: React.MouseEvent, pl: SaavnPlaylist) => {
    e.stopPropagation();
    setQuickPlayingId(pl.id);
    try {
      const loaded = await loadSaavnPlaylist(pl.id);
      if (loaded && loaded.songs && loaded.songs.length > 0) {
        playSong(loaded.songs[0], loaded.songs);
        showToast(`Playing playlist: "${pl.title}" 🎶`, "success");
      }
    } catch (err) {
      console.error("Failed to quick play playlist:", err);
      showToast("Unable to play playlist at this moment", "error");
    } finally {
      setQuickPlayingId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    contentTopRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    createPlaylist(newPlName, newPlDesc);
    setNewPlName("");
    setNewPlDesc("");
    setShowCreateModal(false);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div ref={contentTopRef} className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-40 animate-fade-in">
      {/* Top Header & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Curated Playlists Hub
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Playlists
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Discover thousands of handpicked mixes, genre collections, and your personal playlists.
          </p>
        </div>

        {/* Primary View Switcher: Discover vs My Library */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl shrink-0 self-start md:self-auto shadow-xl">
          <button
            onClick={() => {
              setActiveTab("discover");
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "discover"
                ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-black shadow-lg shadow-sky-500/25"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <CompassIcon className="w-3.5 h-3.5" />
            Discover Mixes
          </button>

          <button
            onClick={() => {
              setActiveTab("library");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "library"
                ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-black shadow-lg shadow-sky-500/25"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5" />
            My Library
            {customPlaylists.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-sky-300">
                {customPlaylists.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* DISCOVER TAB */}
      {activeTab === "discover" && (
        <div className="space-y-8">
          {/* Unified Search & Filters Hub */}
          <div className="space-y-4">
            {/* Search Input & Language Selector */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={`Search any playlist (e.g. "${selectedLanguage} 90s hits", "Anirudh", "Lo-Fi Melodies")...`}
                  className="w-full bg-slate-900/80 border border-white/15 focus:border-sky-400 text-white text-xs sm:text-sm pl-11 pr-10 py-3 rounded-2xl outline-none placeholder:text-slate-500 shadow-inner backdrop-blur-xl transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Language Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 lg:pb-0 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 shrink-0">
                <Globe className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" />
                {POPULAR_LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
                  return (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setPreferredLanguage(lang);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isSelected
                          ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-black shadow-md shadow-sky-500/25"
                          : "text-slate-300 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Popular Search Tags */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sky-400" /> Popular:
              </span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchInput(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all shrink-0 ${
                    searchInput === tag
                      ? "bg-sky-500/20 text-sky-300 border-sky-400 shadow-sm"
                      : "bg-slate-900/60 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Category / Mood Pills */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 border-b border-white/10 pt-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id && !debouncedSearch;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearchInput("");
                      setPage(1);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-black shadow-md shadow-sky-500/30"
                        : "bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Counter & Sorting Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {debouncedSearch
                  ? `Results for "${debouncedSearch}"`
                  : CATEGORIES.find((c) => c.id === activeCategory)?.label || "Playlists"}
              </h3>
              {!loading && totalCount > 0 && (
                <span className="text-xs text-slate-400 font-medium">
                  ({(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount})
                </span>
              )}
            </div>

            {!loading && totalPages > 1 && (
              <span className="text-xs font-semibold text-slate-400">
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          {/* Playlists Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 bg-slate-900/60 border border-white/[0.06] rounded-3xl animate-pulse space-y-3"
                >
                  <div className="w-full aspect-square bg-slate-800/80 rounded-2xl" />
                  <div className="h-4 bg-slate-800 rounded-lg w-3/4" />
                  <div className="h-3 bg-slate-800/60 rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-white/15 rounded-3xl space-y-4 max-w-lg mx-auto bg-slate-900/40 backdrop-blur-xl">
              <Disc className="w-12 h-12 text-slate-500 mx-auto animate-spin-slow" />
              <div>
                <h3 className="text-base font-bold text-white">No playlists found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for another artist, keyword, or switch language.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchInput("");
                  setActiveCategory("melodies");
                  setPage(1);
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-full border border-white/15 transition-all"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => handleOpenSaavnPlaylist(pl.id)}
                  className="group p-3.5 sm:p-4 bg-slate-900/70 hover:bg-slate-850/90 border border-white/[0.08] hover:border-sky-400/50 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-sky-500/20 flex flex-col justify-between relative backdrop-blur-xl"
                >
                  {/* Artwork Container */}
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-950 shadow-inner">
                    <img
                      src={
                        pl.image ||
                        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80"
                      }
                      alt={pl.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      {pl.songCount ? (
                        <div className="px-2 py-0.5 rounded-lg bg-slate-950/80 border border-white/15 text-[10px] font-bold text-white backdrop-blur-md shadow-sm">
                          {pl.songCount} Tracks
                        </div>
                      ) : <span />}

                      {pl.language && (
                        <div className="px-2 py-0.5 rounded-lg bg-sky-500 text-slate-950 text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm">
                          {pl.language}
                        </div>
                      )}
                    </div>

                    {/* Quick Play Hover Button */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => handleQuickPlay(e, pl)}
                        className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 shadow-sky-500/50"
                        title="Play Playlist"
                      >
                        {quickPlayingId === pl.id ? (
                          <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Playlist Metadata */}
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-400 truncate transition-colors">
                      {pl.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {pl.subtitle || pl.headerDesc || "Curated Playlist"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
              <p className="text-xs text-slate-400">
                Showing <span className="font-bold text-white">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-bold text-white">{Math.min(page * limit, totalCount)}</span> of{" "}
                <span className="font-bold text-white">{totalCount}</span> playlists
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-white/10 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (page <= 3) {
                    pageNum = idx + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = page - 2 + idx;
                  }

                  const isCurrent = page === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-black shadow-md shadow-sky-500/30"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-white/10 transition-all"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIBRARY TAB (User Custom Playlists) */}
      {activeTab === "library" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white">Your Created Playlists</h2>
              <p className="text-xs text-slate-400">Custom collections saved on your device</p>
            </div>

            <button
              onClick={() => {
                if (isGuest) {
                  openAuthModal("register");
                } else {
                  setShowCreateModal(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Create New Playlist
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Create New Card Trigger */}
            <div
              onClick={() => {
                if (isGuest) openAuthModal("register");
                else setShowCreateModal(true);
              }}
              className="group p-4 bg-slate-900/50 hover:bg-slate-850/80 border-2 border-dashed border-sky-400/40 hover:border-sky-400 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-[1.03] flex flex-col items-center justify-center text-center space-y-3 aspect-square backdrop-blur-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-sky-500/20">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                  Create Playlist
                </h4>
                <p className="text-[11px] text-slate-400">Build your custom mix</p>
              </div>
            </div>

            {/* User Custom Playlist Cards */}
            {customPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => {
                  setActivePlaylist(pl);
                  setActiveView(`/playlists/${pl.id}`);
                }}
                className="group p-3.5 sm:p-4 bg-slate-900/70 hover:bg-slate-850/90 border border-white/[0.08] hover:border-sky-400/50 rounded-3xl cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-xl flex flex-col justify-between backdrop-blur-xl"
              >
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-950 shadow-inner">
                  <img
                    src={
                      pl.cover_url ||
                      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"
                    }
                    alt={pl.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-white/15 text-[10px] font-bold text-slate-200 backdrop-blur-md">
                    {pl.songs.length} Tracks
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-400 truncate">
                    {pl.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    {pl.description || "Custom Playlist"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl animate-fade-in">
          <div className="bg-slate-900/95 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <ListMusic className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Create New Playlist</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Playlist Name
                </label>
                <input
                  type="text"
                  required
                  value={newPlName}
                  onChange={(e) => setNewPlName(e.target.value)}
                  placeholder="e.g. Late Night Vibes"
                  className="w-full bg-slate-800/90 border border-white/15 focus:border-sky-400 text-white text-sm rounded-2xl px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={newPlDesc}
                  onChange={(e) => setNewPlDesc(e.target.value)}
                  placeholder="What's the vibe of this playlist?"
                  className="w-full bg-slate-800/90 border border-white/15 focus:border-sky-400 text-white text-sm rounded-2xl px-4 py-3 outline-none h-24 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-sky-500/30"
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

function CompassIcon(props: any) {
  return <Sparkles {...props} />;
}

