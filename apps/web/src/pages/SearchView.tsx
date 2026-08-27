import React, { useState, useEffect } from "react";
import { Song, searchSongs } from "@aruvi/shared";
import { SongListRow } from "../components/SongListRow";
import { SongCard } from "../components/SongCard";
import { SkeletonList, SkeletonGrid } from "../components/SkeletonLoader";
import { Search as SearchIcon, X, Clock, Sparkles, Music, Mic2, Disc, ListMusic } from "lucide-react";

interface SearchViewProps {
  initialQuery?: string;
}

export const SearchView: React.FC<SearchViewProps> = ({ initialQuery = "" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<"all" | "songs" | "artists" | "albums">("all");
  const [results, setResults] = useState<Song[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("aruvi_recent_searches") || '["Hukum", "Anirudh", "AR Rahman", "Katchi Sera"]');
    } catch {
      return ["Hukum", "Anirudh", "AR Rahman"];
    }
  });
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchSongs(query);
        setResults(res);

        // Save query to recent searches
        const updated = [query.trim(), ...recentSearches.filter((s) => s.toLowerCase() !== query.trim().toLowerCase())].slice(0, 8);
        setRecentSearches(updated);
        localStorage.setItem("aruvi_recent_searches", JSON.stringify(updated));
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("aruvi_recent_searches");
  };

  const handleSelectSuggestion = (term: string) => {
    setQuery(term);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Search Header Bar */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Search Music</h1>
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-base rounded-2xl pl-12 pr-10 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-500 shadow-xl"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: "all", label: "All Results", icon: Sparkles },
          { id: "songs", label: "Songs", icon: Music },
          { id: "artists", label: "Artists", icon: Mic2 },
          { id: "albums", label: "Albums", icon: Disc },
        ].map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-850"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input Empty State: Recent Searches & Suggestions */}
      {!query.trim() && (
        <div className="space-y-8 animate-fade-in">
          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" /> Recent Searches
                </h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-zinc-500 hover:text-rose-400 transition-colors font-medium"
                >
                  Clear Recent
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSuggestion(term)}
                    className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-full text-xs font-semibold transition-all"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Suggestions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Popular Searches
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["Hukum", "Kaavaalaa", "Naa Ready", "Badass", "Katchi Sera", "Ordinary Person", "Illuminati", "Minnaley"].map(
                (item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="p-3.5 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] text-xs font-bold text-white flex items-center gap-2"
                  >
                    <SearchIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="truncate">{item}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Shimmers */}
      {loading && <SkeletonList count={8} />}

      {/* Results View */}
      {!loading && query.trim() && (
        <div className="space-y-6 animate-fade-in">
          {results.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl space-y-2">
              <Music className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No results found for "{query}"</h3>
              <p className="text-xs text-zinc-400">Try searching for song titles, artist names, or movie soundtracks.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Found {results.length} results
                </span>
              </div>

              {activeCategory === "songs" || activeCategory === "all" ? (
                <div className="space-y-1">
                  {results.map((song, idx) => (
                    <SongListRow key={song.id} song={song} index={idx} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {results.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
