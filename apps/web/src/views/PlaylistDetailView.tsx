import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlaylistStore } from "../store/playlistStore";
import { usePlayerStore } from "../store/playerStore";
import { useLikedStore } from "../store/likedStore";
import { useToastStore } from "../store/toastStore";
import { useAuthStore } from "../store/authStore";
import { SongListRow } from "../components/SongListRow";
import {
  Song,
  getRelatedSongs,
  searchSongs,
  extractPrimaryArtist,
  isAlternateVersion,
} from "@aruvi/shared";
import {
  Play,
  Pause,
  Shuffle,
  Trash2,
  ArrowLeft,
  Disc,
  Loader2,
  Sparkles,
  Plus,
  Check,
  Search,
  Share2,
  Clock,
  Music,
  Heart,
  X,
  ListMusic,
  LayoutGrid,
  List,
  AlignJustify,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  BookmarkPlus,
} from "lucide-react";

interface PlaylistDetailViewProps {
  setActiveView?: (view: string) => void;
}

interface DisplayTrack {
  song: Song;
  isEnhanced?: boolean;
}

type SortOption = "default" | "title-asc" | "title-desc" | "artist" | "duration-asc" | "duration-desc" | "album";
type LayoutMode = "cozy" | "compact" | "grid";

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ setActiveView }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    playlists,
    activePlaylist,
    setActivePlaylist,
    loadSaavnPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
  } = usePlaylistStore();

  const { playSong, currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();
  const { authMode, openAuthModal } = useAuthStore();
  const { show: showToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  const [enhancedTracks, setEnhancedTracks] = useState<DisplayTrack[]>([]);
  const [addedSongIds, setAddedSongIds] = useState<Set<string>>(new Set());

  // Filter, Sort, Layout & Pagination States
  const [filterQuery, setFilterQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("cozy");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageJumpInput, setPageJumpInput] = useState<string>("");

  // In-page Song Search & Add (for custom playlists)
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<Song[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);

  const playlistHeaderRef = useRef<HTMLDivElement>(null);
  const tracklistTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    if (activePlaylist && activePlaylist.id === id) {
      setLoading(false);
      setLoadError(false);
      return;
    }

    const foundLocal = playlists.find((p) => p.id === id);
    if (foundLocal) {
      setActivePlaylist(foundLocal);
      setLoading(false);
      setLoadError(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setLoadError(false);

    loadSaavnPlaylist(id)
      .then((res) => {
        if (isCancelled) return;
        if (!res) {
          setLoadError(true);
        }
      })
      .catch((e) => {
        console.warn("Failed to fetch playlist by route id:", e);
        if (!isCancelled) setLoadError(true);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [id, activePlaylist?.id, playlists, loadSaavnPlaylist, setActivePlaylist]);

  // Reset page when filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, pageSize, sortBy]);

  const handleBack = () => {
    if (setActiveView) {
      setActiveView("playlists");
    } else {
      navigate("/playlists");
    }
  };

  const handleToggleEnhance = async () => {
    if (isEnhancedMode) {
      setIsEnhancedMode(false);
      showToast("Smart Enhance turned off", "info");
      return;
    }

    if (!activePlaylist || activePlaylist.songs.length === 0) {
      showToast("Add songs to this playlist first to enable Smart Enhance!", "info");
      return;
    }

    setIsEnhancing(true);
    try {
      const originalSongs = activePlaylist.songs;
      const seedSong = originalSongs[0];
      const artist = extractPrimaryArtist(seedSong);

      let recommendations: Song[] = [];
      try {
        recommendations = await getRelatedSongs(seedSong.id);
      } catch (e) {}

      if (recommendations.length < 5 && artist) {
        try {
          const artistHits = await searchSongs(`${artist} hits`);
          recommendations = [...recommendations, ...artistHits];
        } catch (e) {}
      }

      // Filter out existing songs
      const filteredRecs = recommendations.filter(
        (rec) => !originalSongs.some((orig) => orig.id === rec.id || isAlternateVersion(rec, orig))
      );

      // Interleaved enhanced list: 2 original songs -> 1 recommended song
      const mixed: DisplayTrack[] = [];
      let recIndex = 0;

      for (let i = 0; i < originalSongs.length; i++) {
        mixed.push({ song: originalSongs[i], isEnhanced: false });
        if ((i + 1) % 2 === 0 && recIndex < filteredRecs.length) {
          mixed.push({ song: filteredRecs[recIndex], isEnhanced: true });
          recIndex++;
        }
      }

      setEnhancedTracks(mixed);
      setIsEnhancedMode(true);
      showToast("✨ Smart Enhance activated! AI recommendations added.", "success");
    } catch (e) {
      console.error("Enhance playlist error:", e);
      showToast("Could not fetch recommendations at this moment.", "error");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAddEnhancedToPlaylist = async (song: Song) => {
    if (!activePlaylist || (activePlaylist as any).is_saavn) {
      showToast("Cannot add to curated playlists directly.", "info");
      return;
    }
    await addSongToPlaylist(activePlaylist.id, song);
    setAddedSongIds((prev) => new Set(prev).add(song.id));
    showToast(`Added "${song.title}" permanently to playlist!`, "success");
  };

  const effectiveSongs = useMemo(() => {
    if (isEnhancedMode) return enhancedTracks.map((t) => t.song);
    return activePlaylist?.songs || [];
  }, [isEnhancedMode, enhancedTracks, activePlaylist?.songs]);

  // Filtered & Sorted Tracks
  const processedSongs = useMemo(() => {
    let result = [...effectiveSongs];

    // Filter
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.album && s.album.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case "title-asc":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "artist":
        result.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
      case "duration-asc":
        result.sort((a, b) => (a.duration || 0) - (b.duration || 0));
        break;
      case "duration-desc":
        result.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        break;
      case "album":
        result.sort((a, b) => (a.album || "").localeCompare(b.album || ""));
        break;
      default:
        break;
    }

    return result;
  }, [effectiveSongs, filterQuery, sortBy]);

  // Pagination Calculation
  const totalTracks = processedSongs.length;
  const isAllPages = pageSize >= 999;
  const totalPages = isAllPages ? 1 : Math.max(1, Math.ceil(totalTracks / pageSize));
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedSongs = useMemo(() => {
    if (isAllPages) return processedSongs;
    const startIndex = (clampedPage - 1) * pageSize;
    return processedSongs.slice(startIndex, startIndex + pageSize);
  }, [processedSongs, clampedPage, pageSize, isAllPages]);

  const totalDurationFormatted = useMemo(() => {
    const totalSecs = effectiveSongs.reduce((acc, s) => acc + (s.duration || 210), 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0) {
      return `${hrs} hr ${mins} min`;
    }
    return `${mins} min`;
  }, [effectiveSongs]);

  const isPlaylistActivePlaying = useMemo(() => {
    if (!currentSong || !isPlaying) return false;
    return effectiveSongs.some((s) => s.id === currentSong.id);
  }, [currentSong, isPlaying, effectiveSongs]);

  const handlePlayAll = () => {
    if (effectiveSongs.length === 0) return;
    if (isPlaylistActivePlaying) {
      togglePlay();
    } else {
      playSong(effectiveSongs[0], effectiveSongs);
      showToast(`Playing playlist: "${activePlaylist?.name}" 🎶`, "success");
    }
  };

  const handleShufflePlay = () => {
    if (effectiveSongs.length === 0) return;
    const shuffled = [...effectiveSongs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
    showToast(`Shuffled and playing "${activePlaylist?.name}" 🔀`, "success");
  };

  const handleSaveAllToLiked = () => {
    if (effectiveSongs.length === 0) return;
    if (authMode === "guest") {
      openAuthModal("login");
      return;
    }
    effectiveSongs.forEach((song) => {
      if (!isLiked(song.id)) {
        toggleLike(song);
      }
    });
    showToast(`Saved ${effectiveSongs.length} songs to your Liked Songs! ❤️`, "success");
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("Playlist link copied to clipboard! 🔗", "success");
    }
  };

  const handleDelete = () => {
    if (!activePlaylist) return;
    if (confirm(`Are you sure you want to delete "${activePlaylist.name}"?`)) {
      deletePlaylist(activePlaylist.id);
      handleBack();
    }
  };

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(pageJumpInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
      setPageJumpInput("");
      tracklistTopRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      showToast(`Please enter a valid page number (1–${totalPages})`, "error");
    }
  };

  const handleScrollToTop = () => {
    playlistHeaderRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Catalog search handler
  useEffect(() => {
    if (!catalogQuery.trim()) {
      setCatalogResults([]);
      setIsSearchingCatalog(false);
      return;
    }

    setIsSearchingCatalog(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchSongs(catalogQuery);
        setCatalogResults(results.slice(0, 8));
      } catch (err) {
        console.error("Catalog search error:", err);
      } finally {
        setIsSearchingCatalog(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [catalogQuery]);

  const handleAddFromCatalog = async (song: Song) => {
    if (!activePlaylist) return;
    await addSongToPlaylist(activePlaylist.id, song);
    showToast(`Added "${song.title}" to ${activePlaylist.name}!`, "success");
  };

  if (loading || (id && activePlaylist?.id !== id && !loadError)) {
    return (
      <div className="p-16 text-center my-16 space-y-4 animate-fade-in max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-sky-400/30 flex items-center justify-center mx-auto shadow-2xl shadow-sky-500/20">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white">Loading Playlist...</h3>
        <p className="text-xs text-slate-400">Fetching curated tracklists and high-res artwork</p>
      </div>
    );
  }

  if (loadError || !activePlaylist || (id && activePlaylist.id !== id)) {
    return (
      <div className="p-12 text-center my-16 space-y-5 animate-fade-in max-w-md mx-auto bg-slate-900/60 border border-white/10 rounded-3xl backdrop-blur-2xl">
        <Disc className="w-14 h-14 text-slate-500 mx-auto animate-spin-slow" />
        <div>
          <h3 className="text-xl font-extrabold text-white">Playlist Not Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            The playlist you are trying to view is unavailable or was removed.
          </p>
        </div>
        <button
          onClick={handleBack}
          className="px-6 py-2.5 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-xs rounded-full shadow-lg shadow-sky-500/25 transition-all"
        >
          Back to Playlists Hub
        </button>
      </div>
    );
  }

  const isCustomPlaylist = !(activePlaylist as any).is_saavn;

  return (
    <div ref={playlistHeaderRef} className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-44 animate-fade-in">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Playlists Hub</span>
          <span className="text-slate-600">/</span>
          <span className="text-sky-400 font-semibold truncate max-w-xs">{activePlaylist.name}</span>
        </button>

        {/* Save All to Liked */}
        <button
          onClick={handleSaveAllToLiked}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:border-rose-500/40 text-xs font-semibold text-slate-300 hover:text-rose-400 transition-all shadow-sm"
          title="Save all songs in this playlist to your Liked Songs"
        >
          <Heart className="w-3.5 h-3.5" />
          Save All to Liked
        </button>
      </div>

      {/* Cinematic Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-800/90 via-slate-900/95 to-[#0a0f1d] border border-white/15 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
          {/* Cover Art */}
          <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-3xl overflow-hidden shadow-2xl shrink-0 border border-white/20 group bg-slate-950">
            <img
              src={
                activePlaylist.cover_url ||
                "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"
              }
              alt={activePlaylist.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          </div>

          {/* Playlist Metadata & Details */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-extrabold text-[10px] uppercase tracking-wider">
                {isCustomPlaylist ? "Custom User Playlist" : "JioSaavn Official Curated"}
              </span>

              {isEnhancedMode && (
                <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Enhanced
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {activePlaylist.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {activePlaylist.description || "Curated collection of high-energy beats, classic melodies, and streaming favorites."}
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400 font-semibold pt-1">
              <span className="flex items-center gap-1.5 text-white">
                <Music className="w-3.5 h-3.5 text-sky-400" />
                {effectiveSongs.length} Songs
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {totalDurationFormatted}
              </span>
              <span>•</span>
              <span className="text-slate-400">
                {isCustomPlaylist ? "Saved on Device" : "High Bitrate 320kbps Stream"}
              </span>
            </div>

            {/* Primary Action Controls */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-4">
              {/* Play All Button */}
              <button
                onClick={handlePlayAll}
                disabled={effectiveSongs.length === 0}
                className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-tr from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-xs rounded-full shadow-xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaylistActivePlaying ? (
                  <Pause className="w-4 h-4 fill-slate-950" />
                ) : (
                  <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                )}
                {isPlaylistActivePlaying ? "Pause Playlist" : "Play All"}
              </button>

              {/* Shuffle Play */}
              <button
                onClick={handleShufflePlay}
                disabled={effectiveSongs.length === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-white/15 hover:border-sky-400/40 shadow-md transition-all hover:scale-105 active:scale-95"
                title="Shuffle Play"
              >
                <Shuffle className="w-3.5 h-3.5 text-sky-400" />
                Shuffle
              </button>

              {/* Smart Enhance Button */}
              <button
                onClick={handleToggleEnhance}
                disabled={isEnhancing || activePlaylist.songs.length === 0}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${
                  isEnhancedMode
                    ? "bg-sky-500/20 text-sky-300 border-sky-400 shadow-md shadow-sky-500/20"
                    : "bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border-white/15"
                }`}
              >
                {isEnhancing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{isEnhancedMode ? "Smart Enhanced" : "Enhance"}</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="p-3 text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 border border-white/15 rounded-full transition-all hover:scale-105 active:scale-95"
                title="Share Playlist Link"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* Delete Custom Playlist */}
              {isCustomPlaylist && (
                <button
                  onClick={handleDelete}
                  className="p-3 text-slate-400 hover:text-rose-400 bg-slate-800/90 hover:bg-slate-750 border border-white/15 rounded-full transition-all hover:scale-105 active:scale-95"
                  title="Delete Playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Tracklist Controls & Utilities Bar */}
      <div ref={tracklistTopRef} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search tracks, artists, or album..."
              className="w-full bg-slate-800/90 border border-white/10 focus:border-sky-400 text-white text-xs pl-10 pr-9 py-2.5 rounded-xl outline-none placeholder:text-slate-400 shadow-inner transition-all"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Sort, Layout, Page Size */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-white/10">
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs text-slate-200 font-bold outline-none cursor-pointer pr-1"
              >
                <option value="default" className="bg-slate-900 text-white">Default Order</option>
                <option value="title-asc" className="bg-slate-900 text-white">Title (A → Z)</option>
                <option value="title-desc" className="bg-slate-900 text-white">Title (Z → A)</option>
                <option value="artist" className="bg-slate-900 text-white">Artist (A → Z)</option>
                <option value="duration-asc" className="bg-slate-900 text-white">Duration (Shortest)</option>
                <option value="duration-desc" className="bg-slate-900 text-white">Duration (Longest)</option>
                <option value="album" className="bg-slate-900 text-white">Album (A → Z)</option>
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="text-[11px] text-slate-400 font-semibold">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs text-sky-400 font-black outline-none cursor-pointer"
              >
                <option value={10} className="bg-slate-900 text-white">10</option>
                <option value={25} className="bg-slate-900 text-white">25</option>
                <option value={50} className="bg-slate-900 text-white">50</option>
                <option value={100} className="bg-slate-900 text-white">100</option>
                <option value={9999} className="bg-slate-900 text-white">All</option>
              </select>
            </div>

            {/* Layout Switcher */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setLayoutMode("cozy")}
                className={`p-1.5 rounded-lg transition-colors ${
                  layoutMode === "cozy"
                    ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Cozy List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setLayoutMode("compact")}
                className={`p-1.5 rounded-lg transition-colors ${
                  layoutMode === "compact"
                    ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Compact Table View"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setLayoutMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  layoutMode === "grid"
                    ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Info & Range Bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">
              {filterQuery ? `Matching Results for "${filterQuery}"` : "All Playlist Tracks"}
            </span>
            <span className="text-xs text-slate-400">
              ({totalTracks} {totalTracks === 1 ? "track" : "tracks"})
            </span>
          </div>

          {!isAllPages && totalPages > 1 && (
            <span className="text-xs text-slate-400 font-semibold">
              Showing {(clampedPage - 1) * pageSize + 1}–{Math.min(clampedPage * pageSize, totalTracks)} of {totalTracks} • Page {clampedPage} of {totalPages}
            </span>
          )}
        </div>

        {/* Tracklist Rendering (Empty / Cozy / Compact / Grid) */}
        {paginatedSongs.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-white/15 rounded-3xl space-y-4 bg-slate-900/40 backdrop-blur-xl">
            <Disc className="w-12 h-12 text-slate-500 mx-auto" />
            <div>
              <h4 className="text-base font-bold text-white">No tracks found</h4>
              <p className="text-xs text-slate-400 mt-1">
                {filterQuery
                  ? `No tracks matched your search for "${filterQuery}".`
                  : "This playlist does not have any songs added yet."}
              </p>
            </div>
            {filterQuery && (
              <button
                onClick={() => setFilterQuery("")}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-full border border-white/10"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : layoutMode === "grid" ? (
          /* GRID LAYOUT VIEW */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 animate-fade-in">
            {paginatedSongs.map((song, idx) => {
              const globalIndex = (clampedPage - 1) * pageSize + idx;
              const isCurrent = currentSong?.id === song.id;
              const liked = isLiked(song.id);

              return (
                <div
                  key={`${song.id}_${globalIndex}`}
                  onClick={() => playSong(song, effectiveSongs)}
                  className={`group p-3.5 bg-slate-900/70 hover:bg-slate-850/90 border rounded-3xl cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-xl flex flex-col justify-between backdrop-blur-xl relative ${
                    isCurrent
                      ? "border-sky-400/50 shadow-sky-500/20 bg-sky-950/20"
                      : "border-white/[0.08] hover:border-sky-400/40"
                  }`}
                >
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-950 shadow-inner">
                    <img
                      src={song.artwork || "/aruvi-play.png"}
                      alt={song.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Top track index badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-white/15 text-[10px] font-bold text-white backdrop-blur-md">
                      #{globalIndex + 1}
                    </div>

                    {/* Play Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-slate-950 flex items-center justify-center shadow-xl shadow-sky-500/40 group-hover:scale-110 active:scale-95 transition-transform">
                        {isCurrent && isPlaying ? (
                          <Pause className="w-5 h-5 fill-slate-950" />
                        ) : (
                          <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className={`text-xs font-bold truncate transition-colors ${
                      isCurrent ? "text-sky-400" : "text-white group-hover:text-sky-300"
                    }`}>
                      {song.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* COZY & COMPACT LIST VIEWS */
          <div className="space-y-1.5 animate-fade-in">
            {paginatedSongs.map((song, idx) => {
              const globalIndex = (clampedPage - 1) * pageSize + idx;
              const isEnhanced = isEnhancedMode && enhancedTracks[globalIndex]?.isEnhanced;

              return (
                <div key={`${song.id}_${globalIndex}`} className="relative group">
                  <SongListRow
                    song={song}
                    index={globalIndex}
                    queue={effectiveSongs}
                  />

                  {/* AI Recommendation Badge / Add Button */}
                  {isEnhanced && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-14 sm:right-28 flex items-center gap-2 pointer-events-auto">
                      <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[9px] font-black uppercase tracking-wider">
                        ✨ Recommended
                      </span>
                      {isCustomPlaylist && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddEnhancedToPlaylist(song);
                          }}
                          disabled={addedSongIds.has(song.id)}
                          className="p-1.5 rounded-full bg-slate-800 hover:bg-sky-400 text-slate-300 hover:text-slate-950 transition-colors border border-slate-700"
                          title="Add to this playlist permanently"
                        >
                          {addedSongIds.has(song.id) ? (
                            <Check className="w-3.5 h-3.5 text-sky-400" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Custom Playlist Remove Track Button */}
                  {isCustomPlaylist && !isEnhanced && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-14 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSongFromPlaylist(activePlaylist.id, song.id);
                        }}
                        className="p-1.5 rounded-full bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Remove track from playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Comprehensive Pagination Controls */}
        {!isAllPages && totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10 mt-6">
            {/* Left Status & Scroll to top */}
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">
                Page <span className="font-bold text-white">{clampedPage}</span> of{" "}
                <span className="font-bold text-white">{totalPages}</span> ({totalTracks} items)
              </p>
              <button
                onClick={handleScrollToTop}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
                title="Scroll to top of playlist"
              >
                <ArrowUp className="w-3 h-3" /> Top
              </button>
            </div>

            {/* Center Page Numbers Navigation */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {/* First Page */}
              <button
                onClick={() => {
                  setCurrentPage(1);
                  tracklistTopRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                disabled={clampedPage === 1}
                className="p-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-white/10 transition-all"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => {
                  setCurrentPage(Math.max(1, clampedPage - 1));
                  tracklistTopRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                disabled={clampedPage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-white/10 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>

              {/* Page Number Chips */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = idx + 1;
                } else if (clampedPage <= 3) {
                  pageNum = idx + 1;
                } else if (clampedPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + idx;
                } else {
                  pageNum = clampedPage - 2 + idx;
                }

                const isCurrent = clampedPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      tracklistTopRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 font-black shadow-md shadow-sky-500/30 scale-105"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                onClick={() => {
                  setCurrentPage(Math.min(totalPages, clampedPage + 1));
                  tracklistTopRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                disabled={clampedPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-white/10 transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => {
                  setCurrentPage(totalPages);
                  tracklistTopRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                disabled={clampedPage === totalPages}
                className="p-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-white/10 transition-all"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Direct Page Jump Form */}
            <form onSubmit={handlePageJumpSubmit} className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Go to:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageJumpInput}
                onChange={(e) => setPageJumpInput(e.target.value)}
                placeholder={`${clampedPage}`}
                className="w-14 bg-slate-900 border border-white/10 focus:border-sky-400 text-white text-xs px-2 py-1.5 rounded-lg text-center outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-bold rounded-lg border border-white/10"
              >
                Go
              </button>
            </form>
          </div>
        )}
      </div>

      {/* In-Playlist Catalog Search & Add Helper (for Custom Playlists) */}
      {isCustomPlaylist && (
        <div className="pt-10 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-sky-400" />
                Add More Songs to "{activePlaylist.name}"
              </h3>
              <p className="text-xs text-slate-400">Search millions of songs online and append them instantly</p>
            </div>
          </div>

          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search by song name, artist, or movie..."
              className="w-full bg-slate-900/90 border border-white/15 focus:border-sky-400 text-white text-xs sm:text-sm pl-11 pr-10 py-3 rounded-2xl outline-none placeholder:text-slate-500 shadow-inner"
            />
            {catalogQuery && (
              <button
                onClick={() => setCatalogQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isSearchingCatalog && (
            <div className="flex items-center gap-2 text-xs text-sky-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching music catalog...</span>
            </div>
          )}

          {catalogResults.length > 0 && (
            <div className="space-y-2 pt-2 bg-slate-900/60 border border-white/10 p-4 rounded-3xl backdrop-blur-xl animate-fade-in">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Matching Online Songs
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catalogResults.map((s) => {
                  const alreadyInPl = activePlaylist.songs.some((x) => x.id === s.id);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={s.artwork || "/aruvi-play.png"}
                          alt={s.title}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-950 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-white truncate">{s.title}</h5>
                          <p className="text-[10px] text-slate-400 truncate">{s.artist}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddFromCatalog(s)}
                        disabled={alreadyInPl}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ml-2 shrink-0 transition-all ${
                          alreadyInPl
                            ? "bg-slate-700/50 text-slate-400 cursor-default"
                            : "bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 hover:scale-105 shadow-md shadow-sky-500/20"
                        }`}
                      >
                        {alreadyInPl ? (
                          <>
                            <Check className="w-3 h-3 text-sky-400" /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" /> Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


