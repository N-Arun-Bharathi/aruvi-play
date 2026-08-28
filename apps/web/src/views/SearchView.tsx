import React, { useState, useEffect } from "react";
import { Song, searchSongs } from "@aruvi/shared";
import { useSettingsStore } from "../store/settingsStore";
import { SongListRow } from "../components/SongListRow";
import { SkeletonList } from "../components/SkeletonLoader";
import { Search as SearchIcon, X, Music, Sparkles } from "lucide-react";

interface SearchViewProps {
  initialQuery?: string;
}

export const SearchView: React.FC<SearchViewProps> = ({ initialQuery = "" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const { preferredLanguage } = useSettingsStore();

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
        const prefLang = (preferredLanguage || "Tamil").toLowerCase();

        res.sort((a, b) => {
          const aMatch = (a.language || "").toLowerCase() === prefLang ? 1 : 0;
          const bMatch = (b.language || "").toLowerCase() === prefLang ? 1 : 0;
          return bMatch - aMatch;
        });

        setResults(res);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, preferredLanguage]);

  const genres = [
    { id: "electronic", name: "Electronic", gradient: "from-pink-600 to-purple-800" },
    { id: "jazz", name: "Jazz", gradient: "from-emerald-600 to-teal-800" },
    { id: "pop", name: "Pop", gradient: "from-indigo-600 to-blue-800" },
    { id: "rock", name: "Rock", gradient: "from-rose-600 to-red-900" },
    { id: "hiphop", name: "Hip-Hop", gradient: "from-zinc-800 to-zinc-950 border border-zinc-750" },
  ];

  return (
    <div className="p-6 sm:p-10 space-y-10 max-w-6xl mx-auto pb-36">
      {/* Centered Large Search Input Box */}
      <div className="flex flex-col items-center justify-center space-y-4 pt-4">
        <div className="relative w-full max-w-xl">
          <SearchIcon className="absolute left-5 top-4 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-zinc-900/90 border border-cyan-500/40 text-white text-base rounded-2xl pl-14 pr-12 py-3.5 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-zinc-500 shadow-2xl shadow-cyan-500/10"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Browse All Genres (When query is empty) */}
      {!query.trim() && (
        <div className="space-y-6 animate-fade-in pt-4">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
            Browse All
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {genres.map((g) => (
              <div
                key={g.id}
                onClick={() => setQuery(g.name)}
                className={`h-40 rounded-2xl bg-gradient-to-br ${g.gradient} p-4 cursor-pointer transition-all hover:scale-105 shadow-xl flex flex-col justify-between group overflow-hidden relative`}
              >
                <h3 className="text-base font-extrabold text-white tracking-tight">{g.name}</h3>
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm self-end flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Music className="w-6 h-6 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && <SkeletonList count={8} />}

      {/* Search Results */}
      {!loading && query.trim() && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Search Results for "{query}"
          </h3>

          <div className="space-y-1">
            {results.map((song, idx) => (
              <SongListRow key={song.id} song={song} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
