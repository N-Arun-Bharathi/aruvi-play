import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SaavnPlaylist,
  searchPlaylistsPaged,
  getFeaturedPlaylists,
} from "@aruvi/shared";
import { usePlaylistStore } from "../store/playlistStore";
import { useSettingsStore } from "../store/settingsStore";
import { usePlayerStore } from "../store/playerStore";
import { useAuthStore } from "../store/authStore";
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
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Globe,
} from "lucide-react";

interface PlaylistsViewProps {
  setActiveView: (view: string) => void;
}

interface CategoryOption {
  id: string;
  label: string;
  icon: React.ElementType;
  querySuffix?: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: "all", label: "All Featured", icon: Sparkles },
  { id: "charts", label: "Top Charts", icon: Flame, querySuffix: "trending hits" },
  { id: "artists", label: "Let's Play", icon: Star, querySuffix: "lets play" },
  { id: "decades", label: "Decades", icon: Clock, querySuffix: "80s 90s 2000s" },
  { id: "kuthu", label: "Kuthu & Party", icon: Flame, querySuffix: "kuthu dance hits" },
  { id: "melodies", label: "Melodies & Chill", icon: Music2, querySuffix: "melody hits" },
  { id: "custom", label: "My Playlists", icon: ListMusic },
];

const POPULAR_LANGUAGES = [
  "Tamil",
  "Telugu",
  "Hindi",
  "Malayalam",
  "Kannada",
  "Punjabi",
  "English",
];

const QUICK_TAGS = [
  "Top 50",
  "90s Melodies",
  "Anirudh Hits",
  "AR Rahman",
  "Yuvan Shankar Raja",
  "Ilaiyaraaja",
  "Kuthu Bangers",
  "Midnight Lo-Fi",
  "Acoustic Chill",
];

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({ setActiveView }) => {
  const { preferredLanguage, setPreferredLanguage } = useSettingsStore();
  const { playlists: customPlaylists, createPlaylist, loadSaavnPlaylist, setActivePlaylist } =
    usePlaylistStore();
  const { playSong } = usePlayerStore();
  const { authMode, openAuthModal } = useAuthStore();

  const isGuest = authMode === "guest";

  const [activeCategory, setActiveCategory] = useState("all");
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
  const [limit] = useState(20);
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
      setPage(1); // Reset to page 1 on new search query
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
    if (activeCategory === "custom") {
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

      // If category has a query suffix (Charts, Artists, Decades, Kuthu, Melodies)
      const currentCat = CATEGORIES.find((c) => c.id === activeCategory);
      if (currentCat?.querySuffix) {
        const query = `${activeLang} ${currentCat.querySuffix}`;
        const res = await searchPlaylistsPaged(query, limit, page);
        setPlaylists(res.playlists);
        setTotalCount(res.total || res.playlists.length);
        return;
      }

      // "All" Featured category
      if (page === 1) {
        const featured = await getFeaturedPlaylists([activeLang]);
        if (featured && featured.length > 0) {
          setPlaylists(featured);
          setTotalCount(Math.max(featured.length, 120));
        } else {
          const res = await searchPlaylistsPaged(`${activeLang} top playlists`, limit, page);
          setPlaylists(res.playlists);
          setTotalCount(res.total || res.playlists.length);
        }
      } else {
        const res = await searchPlaylistsPaged(`${activeLang} top playlists`, limit, page);
        setPlaylists(res.playlists);
        setTotalCount(res.total || res.playlists.length);
      }
    } catch (err) {
      console.error("Failed to load playlists:", err);
      setPlaylists([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, debouncedSearch, selectedLanguage, page, limit]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Handle open playlist details
  const handleOpenSaavnPlaylist = (id: string) => {
    setActiveView(`/playlists/${id}`);
  };

  // Handle quick play
  const handleQuickPlay = async (e: React.MouseEvent, pl: SaavnPlaylist) => {
    e.stopPropagation();
    setQuickPlayingId(pl.id);
    try {
      const loaded = await loadSaavnPlaylist(pl.id);
      if (loaded && loaded.songs && loaded.songs.length > 0) {
        playSong(loaded.songs[0], loaded.songs);
      }
    } catch (err) {
      console.error("Failed to quick play playlist:", err);
    } finally {
      setQuickPlayingId(null);
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    contentTopRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle create playlist submit
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
      {/* Top Header & Search Hero */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                <ListMusic className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-yellow-400">
                Playlists Hub
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Explore Playlists
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Stream hundreds of curated JioSaavn playlists and custom collections in{" "}
              <span className="text-yellow-400 font-semibold">{selectedLanguage}</span> & global charts.
            </p>
          </div>

          {/* Language Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800">
            <Globe className="w-3.5 h-3.5 text-zinc-500 ml-2 mr-1 shrink-0" />
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-500/20"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar with Quick Tags */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Search any playlist (e.g., "${selectedLanguage} 90s Melodies", "Anirudh", "Workout Beats")...`}
              className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-yellow-400 text-white text-sm pl-12 pr-12 py-3.5 rounded-2xl outline-none shadow-inner placeholder:text-zinc-500 transition-all"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Tags */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 text-xs">
            <span className="text-[11px] font-semibold text-zinc-500 shrink-0">Popular:</span>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchInput(tag)}
                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-full shrink-0 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills & Actions */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-850 pb-4 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchInput("");
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-500/20"
                      : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850 border border-zinc-800/80"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  {cat.id === "custom" && customPlaylists.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {customPlaylists.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeCategory === "custom" && (
            <button
              onClick={() => {
                if (isGuest) {
                  openAuthModal("register");
                } else {
                  setShowCreateModal(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl shadow-md shrink-0 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Create Playlist
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      {activeCategory === "custom" ? (
        /* CUSTOM PLAYLISTS SECTION */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Your Custom Playlists</h2>
              <p className="text-xs text-zinc-400">Personal collections created on your device</p>
            </div>
          </div>

          {customPlaylists.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <ListMusic className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No custom playlists yet</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {isGuest
                    ? "Sign in to build and save custom mixes across devices."
                    : "Create your first playlist and add your favorite tracks!"}
                </p>
              </div>
              <button
                onClick={() => {
                  if (isGuest) openAuthModal("register");
                  else setShowCreateModal(true);
                }}
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs rounded-full shadow-lg"
              >
                Create Playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {customPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => {
                    setActivePlaylist(pl);
                    setActiveView(`/playlists/${pl.id}`);
                  }}
                  className="group p-4 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 hover:border-yellow-500/30 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-xl flex flex-col justify-between"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-950 shadow-inner">
                    <img
                      src={
                        pl.cover_url ||
                        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"
                      }
                      alt={pl.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 border border-white/10 text-[10px] font-bold text-zinc-300 backdrop-blur-sm">
                      {pl.songs.length} Songs
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 truncate">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {pl.description || "Custom Playlist"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* JIOSAAVN PLAYLISTS GRID */
        <div className="space-y-6">
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">
                {debouncedSearch
                  ? `Search Results for "${debouncedSearch}"`
                  : activeCategory === "all"
                  ? `Featured Playlists (${selectedLanguage})`
                  : CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </span>
              {!loading && totalCount > 0 && (
                <span className="text-xs text-zinc-500 font-medium">
                  • Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
                </span>
              )}
            </div>

            {/* Quick Page Indicator */}
            {!loading && totalPages > 1 && (
              <span className="text-xs font-semibold text-zinc-400">
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          {/* Playlists Grid / Loading / Empty */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl animate-pulse space-y-3"
                >
                  <div className="w-full aspect-square bg-zinc-800 rounded-xl" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-4 max-w-lg mx-auto">
              <Disc className="w-12 h-12 text-zinc-600 mx-auto animate-spin-slow" />
              <div>
                <h3 className="text-base font-bold text-white">No playlists found</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Try searching for another artist, keyword, or change language.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchInput("");
                  setActiveCategory("all");
                  setPage(1);
                }}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-full border border-zinc-700"
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
                  className="group p-4 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 hover:border-yellow-500/40 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-xl flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Artwork Container */}
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-950 shadow-inner">
                    <img
                      src={
                        pl.image ||
                        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80"
                      }
                      alt={pl.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Track Count Badge */}
                    {pl.songCount && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 border border-white/10 text-[10px] font-bold text-white backdrop-blur-sm">
                        {pl.songCount} Tracks
                      </div>
                    )}

                    {/* Language Badge if available */}
                    {pl.language && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-yellow-500/80 text-zinc-950 text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-sm shadow-sm">
                        {pl.language}
                      </div>
                    )}

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => handleQuickPlay(e, pl)}
                        className="w-12 h-12 rounded-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
                        title="Play Playlist"
                      >
                        {quickPlayingId === pl.id ? (
                          <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Playlist Metadata */}
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 truncate leading-snug">
                      {pl.title}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate mt-1">
                      {pl.subtitle || pl.headerDesc || "JioSaavn Playlist"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {!loading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-zinc-850">
              <p className="text-xs text-zinc-500">
                Showing <span className="font-semibold text-zinc-300">{(page - 1) * limit + 1}</span> to{" "}
                <span className="font-semibold text-zinc-300">{Math.min(page * limit, totalCount)}</span> of{" "}
                <span className="font-semibold text-zinc-300">{totalCount}</span> playlists
              </p>

              <div className="flex items-center gap-1.5">
                {/* Previous Page Button */}
                <button
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-300 border border-zinc-800 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {/* Page Number Buttons */}
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
                          ? "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-500/20"
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next Page Button */}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-300 border border-zinc-800 transition-all"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Playlist Name
                </label>
                <input
                  type="text"
                  required
                  value={newPlName}
                  onChange={(e) => setNewPlName(e.target.value)}
                  placeholder="My Party Bangers"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newPlDesc}
                  onChange={(e) => setNewPlDesc(e.target.value)}
                  placeholder="High energy Tamil dance tracks..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-yellow-400 h-20 resize-none"
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
                  className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold text-xs rounded-xl shadow-md"
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
