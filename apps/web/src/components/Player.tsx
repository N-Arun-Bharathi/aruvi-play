import React, { useState } from "react";
import { usePlayerStore } from "../store/playerStore";
import { useLikedStore } from "../store/likedStore";
import { useTimerStore } from "../store/timerStore";
import { useAuthStore } from "../store/authStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  Maximize2,
  Clock,
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
  const { authMode, openAuthModal } = useAuthStore();
  const { timeLeft, timerActive, setTimer } = useTimerStore();

  const [showTimerMenu, setShowTimerMenu] = useState(false);

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

  const liked = isLiked(currentSong);
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(ratio * duration);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authMode === "guest") {
      openAuthModal("login");
    } else {
      toggleLike(currentSong);
    }
  };

  const formatTimerMinutes = (secs: number) => {
    const m = Math.ceil(secs / 60);
    return `${m}m`;
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl bg-[#12141A]/95 border border-cyan-500/30 rounded-full px-4 sm:px-6 py-2.5 shadow-2xl shadow-cyan-500/20 backdrop-blur-2xl flex items-center justify-between gap-3 sm:gap-4 transition-all group">
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

      {/* Left: Song Artwork & Details + Heart Like Button */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          onClick={toggleExpanded}
          className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-zinc-700/60 shadow-md cursor-pointer hover:scale-105 transition-transform"
        >
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
        <div onClick={toggleExpanded} className="min-w-0 cursor-pointer flex-1">
          <h4 className="text-xs font-bold text-white truncate hover:text-cyan-400 transition-colors">
            {currentSong.title}
          </h4>
          <p className="text-[11px] text-zinc-400 truncate font-medium">
            {currentSong.artist}
          </p>
        </div>
        <button
          onClick={handleLike}
          className={`p-1.5 rounded-full transition-transform active:scale-125 ${
            liked ? "text-rose-500" : "text-zinc-500 hover:text-white"
          }`}
          title={liked ? "Remove from Liked" : "Save to Liked Songs"}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Center: Playback & Shuffle/Repeat Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative z-30">
        {/* Shuffle Button */}
        <button
          onClick={toggleShuffle}
          className={`p-1.5 rounded-full transition-colors ${
            isShuffle
              ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
          title={isShuffle ? "Shuffle On" : "Shuffle Off"}
        >
          <Shuffle className="w-4 h-4" />
        </button>

        {/* Previous Track */}
        <button
          onClick={prev}
          className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800/60 transition-colors"
          title="Previous Track"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-zinc-950" />
          ) : (
            <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
          )}
        </button>

        {/* Next Track */}
        <button
          onClick={next}
          className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800/60 transition-colors"
          title="Next Track"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Repeat Button (Off / All / One) */}
        <button
          onClick={cycleRepeat}
          className={`p-1.5 rounded-full transition-colors relative ${
            repeatMode !== "off"
              ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
          title={
            repeatMode === "off"
              ? "Repeat Off"
              : repeatMode === "all"
              ? "Repeat All"
              : "Repeat Current Song"
          }
        >
          {repeatMode === "one" ? (
            <Repeat1 className="w-4 h-4" />
          ) : (
            <Repeat className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Right: Actions (Volume, Timer, Fullscreen, Queue) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-1 justify-end relative z-30">
        {/* Sleep Timer */}
        <div className="relative">
          <button
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            className={`p-1.5 rounded-full transition-colors flex items-center gap-1 ${
              timerActive
                ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 font-bold text-[10px]"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
            title="Sleep Timer"
          >
            <Clock className="w-4 h-4" />
            {timerActive && timeLeft !== null && (
              <span className="hidden sm:inline font-mono">{formatTimerMinutes(timeLeft)}</span>
            )}
          </button>

          {showTimerMenu && (
            <div className="absolute right-0 bottom-full mb-3 w-40 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-slide-in">
              <div className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">Sleep Timer</div>
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setTimer(mins);
                    setShowTimerMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  {mins} Minutes
                </button>
              ))}
              {timerActive && (
                <button
                  onClick={() => {
                    setTimer(null);
                    setShowTimerMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors border-t border-zinc-800 mt-1"
                >
                  Turn Off Timer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Volume Slider */}
        <div className="hidden md:flex items-center gap-2 group/vol">
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

        {/* Expand / Fullscreen Player */}
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
