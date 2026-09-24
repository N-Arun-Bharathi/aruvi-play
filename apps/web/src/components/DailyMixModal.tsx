import React, { useState, useEffect } from "react";
import { Song, searchSongs, getTrendingSongs, isAlternateVersion } from "@aruvi/shared";
import { usePlayerStore } from "../store/playerStore";
import { useSettingsStore } from "../store/settingsStore";
import { useToastStore } from "../store/toastStore";
import { SongListRow } from "./SongListRow";
import { Play, Shuffle, X, Sparkles, Loader2, Disc, Music } from "lucide-react";

export interface DailyMixData {
  id: string;
  title: string;
  subtitle: string;
  searchQueries: string[];
  gradient: string;
  artists: string;
  icon: string;
}

interface DailyMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  mix: DailyMixData | null;
}

export const DailyMixModal: React.FC<DailyMixModalProps> = ({ isOpen, onClose, mix }) => {
  const { playSong } = usePlayerStore();
  const { preferredLanguage } = useSettingsStore();
  const { show: showToast } = useToastStore();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !mix) return;

    let isCancelled = false;
    setLoading(true);

    async function fetchMixSongs() {
      try {
        const lang = (preferredLanguage || "tamil").toLowerCase();
        const promises = mix!.searchQueries.map((q) => searchSongs(`${q} ${lang}`));
        const results = await Promise.allSettled(promises);

        const combined: Song[] = [];
        for (const res of results) {
          if (res.status === "fulfilled" && res.value && res.value.length > 0) {
            combined.push(...res.value.slice(0, 10));
          }
        }

        const distinct: Song[] = [];
        for (const s of combined) {
          if (!distinct.some((d) => d.id === s.id || isAlternateVersion(d, s))) {
            distinct.push(s);
          }
        }

        if (distinct.length === 0) {
          const trending = await getTrendingSongs([lang]);
          if (trending && trending.length > 0) {
            distinct.push(...trending.slice(0, 20));
          }
        }

        if (!isCancelled) {
          setSongs(distinct);
        }
      } catch (err) {
        console.error("Failed to load mix songs:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchMixSongs();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, mix, preferredLanguage]);

  if (!isOpen || !mix) return null;

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
      showToast(`Playing ${mix.title}: ${mix.subtitle} 🎶`, "success");
    }
  };

  const handleShufflePlay = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
      showToast(`Shuffling ${mix.title} 🔀`, "success");
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-3xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl shadow-sky-500/15 backdrop-blur-2xl flex flex-col max-h-[90vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 p-2 rounded-full bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner with Mix Gradient */}
        <div className={`p-6 sm:p-8 bg-gradient-to-br ${mix.gradient} text-white relative overflow-hidden shrink-0`}>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 relative z-10">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-black/30 border border-white/20 shadow-2xl flex flex-col items-center justify-center text-center p-3 shrink-0">
              <span className="text-4xl mb-1">{mix.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-200">
                Aruvi Mix
              </span>
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                Personalized Daily Mix
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                {mix.title}
              </h2>
              <p className="text-xs text-sky-100/90 font-semibold">{mix.subtitle}</p>
              <p className="text-[11px] text-sky-200/75 truncate">
                Featuring: <strong className="text-white">{mix.artists}</strong>
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3">
                <button
                  onClick={handlePlayAll}
                  disabled={loading || songs.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 hover:bg-sky-50 font-extrabold text-xs rounded-full shadow-lg shadow-black/25 transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-slate-950" /> Play All
                </button>

                <button
                  onClick={handleShufflePlay}
                  disabled={loading || songs.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-black/30 hover:bg-black/40 text-white font-bold text-xs rounded-full border border-white/20 transition-all disabled:opacity-50"
                >
                  <Shuffle className="w-4 h-4" /> Shuffle
                </button>

                <span className="text-xs text-sky-200/80 font-mono font-bold self-center ml-2">
                  {songs.length} Tracks
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tracklist Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
            <span>TRACKLIST ({songs.length} SONGS)</span>
            <span className="flex items-center gap-1 text-sky-400 text-[11px]">
              <Sparkles className="w-3 h-3" /> Auto-refreshed daily
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-xs font-semibold text-white">Curating {mix.title} tracks...</p>
            </div>
          ) : songs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Disc className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-white">No tracks found for this mix.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {songs.map((song, idx) => (
                <SongListRow
                  key={`${song.id}_${idx}`}
                  song={song}
                  index={idx}
                  queue={songs}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
