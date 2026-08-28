import React from "react";
import { usePlayerStore } from "../store/playerStore";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic, Maximize2 } from "lucide-react";

interface PlayerProps {
  onOpenQueue?: () => void;
}

export const Player: React.FC<PlayerProps> = ({ onOpenQueue }) => {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    next,
    prev,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    position,
    duration,
    seekTo,
    toggleExpanded,
  } = usePlayerStore();

  if (!currentSong) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-zinc-900/90 border border-cyan-500/20 rounded-full px-6 py-3.5 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl flex items-center justify-between text-zinc-400 text-xs font-semibold">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400">
            ♫
          </div>
          <span>Select a song to start listening...</span>
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(ratio * duration);
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-3xl bg-[#12141A]/95 border border-cyan-500/30 rounded-full px-5 py-2.5 shadow-2xl shadow-cyan-500/20 backdrop-blur-2xl flex items-center justify-between gap-4 transition-all group">
      {/* Interactive Seeking Bar at top of floating pill */}
      <div
        onClick={handleSeekClick}
        className="absolute -top-1.5 left-6 right-6 h-3.5 flex items-center cursor-pointer z-20 group/seeker"
        title="Click to seek track"
      >
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden relative group-hover/seeker:h-1.5 transition-all">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Left: Song Artwork & Details */}
      <div
        onClick={toggleExpanded}
        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
      >
        <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-zinc-700/60 shadow-md group-hover:scale-105 transition-transform">
          <img
            src={currentSong.artwork || "/aruvi-play.png"}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
            {currentSong.title}
          </h4>
          <p className="text-[11px] text-zinc-400 truncate font-medium">
            {currentSong.artist}
          </p>
        </div>
      </div>

      {/* Center: Controls */}
      <div className="flex items-center gap-3 shrink-0 relative z-30">
        <button
          onClick={prev}
          className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800/60 transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-105 transition-all"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-zinc-950" />
          ) : (
            <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
          )}
        </button>

        <button
          onClick={next}
          className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800/60 transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Actions (Volume & Queue) */}
      <div className="flex items-center gap-3 shrink-0 flex-1 justify-end relative z-30">
        {/* Volume Slider */}
        <div className="hidden sm:flex items-center gap-2 group/vol">
          <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 accent-cyan-400 h-1.5 rounded-lg bg-zinc-800 cursor-pointer opacity-70 group-hover/vol:opacity-100 transition-opacity"
          />
        </div>

        {/* Expand Player */}
        <button
          onClick={toggleExpanded}
          className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800/60 transition-colors"
          title="Fullscreen Player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Open Queue */}
        {onOpenQueue && (
          <button
            onClick={onOpenQueue}
            className="text-zinc-400 hover:text-cyan-400 p-1.5 rounded-full hover:bg-zinc-800/60 transition-colors"
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
