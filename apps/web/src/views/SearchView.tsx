import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Song, searchSongs } from "@aruvi/shared";
import { useSettingsStore } from "../store/settingsStore";
import { usePlayerStore } from "../store/playerStore";
import { SongListRow } from "../components/SongListRow";
import { SkeletonList } from "../components/SkeletonLoader";
import { Search as SearchIcon, X, Music, Sparkles, Play, Shuffle } from "lucide-react";

interface SearchViewProps {
  initialQuery?: string;
}

export const SearchView: React.FC<SearchViewProps> = ({ initialQuery = "" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || initialQuery;
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const { preferredLanguage } = useSettingsStore();
  const { playSong } = usePlayerStore();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null && q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

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

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

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
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-zinc-900/90 border border-cyan-500/40 text-white text-base rounded-2xl pl-14 pr-12 py-3.5 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-zinc-500 shadow-2xl shadow-cyan-500/10"
            autoFocus
          />
          {query && (
            <button
              onClick={() => handleQueryChange("")}
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
                onClick={() => handleQueryChange(g.name)}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Search Results for "{query}" ({results.length})
            </h3>

            {results.length > 0 && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => playSong(results[0], results)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold text-xs rounded-full shadow-md shadow-cyan-400/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-zinc-950" /> Play All
                </button>
                <button
                  onClick={() => {
                    const shuffled = [...results].sort(() => Math.random() - 0.5);
                    playSong(shuffled[0], shuffled);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/30 text-zinc-200 hover:text-white font-bold text-xs rounded-full transition-all hover:scale-105 active:scale-95 shadow-md"
                  title="Shuffle Search Results"
                >
                  <Shuffle className="w-3.5 h-3.5 text-cyan-400" /> Shuffle
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {results.map((song, idx) => (
              <SongListRow key={song.id} song={song} index={idx} queue={results} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
