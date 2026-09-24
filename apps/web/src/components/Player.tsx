import React from "react";
import { usePlayerStore } from "../store/playerStore";
import { useLikedStore } from "../store/likedStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  ListMusic,
  Maximize2,
  Heart,
} from "lucide-react";

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
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLikedStore();

  if (!currentSong) {
    return null;
  }

  const hasLiked = isLiked(currentSong.id);
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(ratio * duration);
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-3xl bg-slate-900/90 border border-white/15 rounded-full px-5 py-2.5 shadow-2xl shadow-sky-500/20 backdrop-blur-2xl flex items-center justify-between gap-3 transition-all group">
      {/* Interactive Top Scrub Bar */}
      <div
        onClick={handleSeekClick}
        className="absolute -top-1.5 left-7 right-7 h-3.5 flex items-center cursor-pointer z-20 group/seeker"
        title={`Click to seek (${formatTime(position)} / ${formatTime(duration)})`}
      >
        <div className="w-full h-1 bg-slate-700/70 rounded-full overflow-hidden relative group-hover/seeker:h-1.5 transition-all">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-sky-300 to-blue-500 transition-all shadow-[0_0_12px_rgba(56,189,248,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Left: Artwork, Song Title, Artist & Like */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          onClick={toggleExpanded}
          className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/15 shadow-md cursor-pointer group-hover:scale-105 transition-transform"
        >
          <img
            src={currentSong.artwork || "/aruvi-play.png"}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            </div>
          )}
        </div>

        <div
          onClick={toggleExpanded}
          className="min-w-0 cursor-pointer flex-1"
        >
          <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-400 transition-colors">
            {currentSong.title}
          </h4>
          <p className="text-[11px] text-slate-400 truncate font-medium">
            {currentSong.artist}
          </p>
        </div>

        {/* Like Button */}
        <button
          onClick={() => toggleLike(currentSong)}
          className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 transition-colors shrink-0"
          title={hasLiked ? "Remove from Liked" : "Like Song"}
        >
          <Heart
            className={`w-4 h-4 transition-transform active:scale-125 ${
              hasLiked ? "fill-rose-500 text-rose-500" : ""
            }`}
          />
        </button>
      </div>

      {/* Center: Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative z-30">
        {/* Shuffle */}
        <button
          onClick={toggleShuffle}
          className={`p-1.5 rounded-full transition-colors ${
            isShuffle ? "text-sky-400 bg-sky-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="Shuffle"
        >
          <Shuffle className="w-3.5 h-3.5" />
        </button>

        {/* Prev */}
        <button
          onClick={prev}
          className="text-slate-300 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          title="Previous Track"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 flex items-center justify-center shadow-lg shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-slate-950" />
          ) : (
            <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={next}
          className="text-slate-300 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          title="Next Track"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Repeat */}
        <button
          onClick={cycleRepeat}
          className={`p-1.5 rounded-full transition-colors ${
            repeatMode !== "off" ? "text-sky-400 bg-sky-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title={`Repeat: ${repeatMode}`}
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Volume, Queue List & Fullscreen */}
      <div className="flex items-center gap-2 shrink-0 flex-1 justify-end relative z-30">
        {/* Volume Slider */}
        <div className="hidden sm:flex items-center gap-1.5 group/vol">
          <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
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
            className="w-14 sm:w-16 accent-sky-400 h-1 bg-slate-700 rounded-lg cursor-pointer opacity-80 group-hover/vol:opacity-100 transition-opacity"
          />
        </div>

        {/* Queue Lists */}
        {onOpenQueue && (
          <button
            onClick={onOpenQueue}
            className="text-slate-400 hover:text-sky-400 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
            title="Queue Lists"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        )}

        {/* Fullscreen Expand */}
        <button
          onClick={toggleExpanded}
          className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          title="Fullscreen Player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
