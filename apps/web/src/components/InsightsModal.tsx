import React, { useEffect } from "react";
import { useInsightsStore } from "../store/insightsStore";
import { usePlayerStore } from "../store/playerStore";
import { BarChart3, X, Flame, Music, Clock, User, Play, Sparkles } from "lucide-react";

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InsightsModal: React.FC<InsightsModalProps> = ({ isOpen, onClose }) => {
  const { stats, loadStats } = useInsightsStore();
  const { playSong } = usePlayerStore();

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, loadStats]);

  if (!isOpen) return null;

  const totalMinutes = Math.round((stats.totalListeningSeconds || 0) / 60);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-500/15 backdrop-blur-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-sky-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Listening Insights & Wrapped
              </h2>
              <p className="text-xs text-slate-400 font-medium">Your personal music tastes & listening stats</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Music Persona Card */}
        <div className={`p-6 rounded-3xl bg-gradient-to-br ${stats.musicPersona.gradient} text-white shadow-xl relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{stats.musicPersona.icon}</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-200">
                Music Persona
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">{stats.musicPersona.title}</h3>
            </div>
          </div>
          <p className="text-xs text-sky-100/90 font-medium leading-relaxed max-w-lg">
            {stats.musicPersona.description}
          </p>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center space-y-1">
            <Clock className="w-4 h-4 text-sky-400 mx-auto" />
            <div className="text-lg sm:text-xl font-black text-white">{totalHours} hrs</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Time</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center space-y-1">
            <Music className="w-4 h-4 text-blue-400 mx-auto" />
            <div className="text-lg sm:text-xl font-black text-white">{stats.totalPlays || 0}</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Songs Played</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center space-y-1">
            <Flame className="w-4 h-4 text-amber-400 mx-auto" />
            <div className="text-lg sm:text-xl font-black text-white">{stats.streakDays || 1} days</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Active Streak</div>
          </div>
        </div>

        {/* Top Songs Leaderboard */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Top Played Songs
          </h3>

          {stats.topSongs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              Start listening to tracks to see your top songs leaderboard!
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {stats.topSongs.slice(0, 5).map((item, idx) => (
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
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-sky-400/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center font-mono font-bold text-xs text-sky-400">
                      #{idx + 1}
                    </span>
                    <img
                      src={item.artwork || "/aruvi-play.png"}
                      alt={item.title}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{item.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono font-semibold">
                      {item.playCount} {item.playCount === 1 ? "play" : "plays"}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-slate-800 group-hover:bg-sky-500 text-slate-300 group-hover:text-slate-950 flex items-center justify-center transition-colors">
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Artists Leaderboard */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-400" /> Top Artists
          </h3>

          {stats.topArtists.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              No top artist data yet. Play more songs to generate artist charts!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stats.topArtists.slice(0, 4).map((artistItem, idx) => (
                <div
                  key={artistItem.artist}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                >
                  <span className="w-4 text-center font-mono font-bold text-xs text-sky-400">
                    #{idx + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-white/10 shrink-0">
                    <img
                      src={artistItem.artwork || "/aruvi-play.png"}
                      alt={artistItem.artist}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{artistItem.artist}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {artistItem.playCount} plays • {formatSeconds(artistItem.totalSecondsPlayed)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
