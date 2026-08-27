import React, { useEffect } from "react";
import { usePlayerStore } from "../store/playerStore";
import { useLikedStore } from "../store/likedStore";
import { useAuthStore } from "../store/authStore";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  Keyboard,
  Sparkles,
} from "lucide-react";

interface FullPlayerModalProps {
  onOpenQueue: () => void;
}

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({ onOpenQueue }) => {
  const {
    currentSong,
    isPlaying,
    position,
    duration,
    repeatMode,
    isShuffle,
    isExpanded,
    togglePlay,
    next,
    prev,
    seekTo,
    toggleShuffle,
    cycleRepeat,
    toggleExpanded,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLikedStore();
  const { authMode, openAuthModal } = useAuthStore();

  // Keyboard Shortcuts (Space = Play/Pause, Arrow Left = Prev, Arrow Right = Next)
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input box
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (e.shiftKey) {
          seekTo(Math.max(0, position - 5));
        } else {
          prev();
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (e.shiftKey) {
          seekTo(Math.min(duration, position + 5));
        } else {
          next();
        }
      } else if (e.code === "Escape") {
        toggleExpanded();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, position, duration, togglePlay, next, prev, seekTo, toggleExpanded]);

  if (!isExpanded || !currentSong) return null;

  const liked = isLiked(currentSong.id);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleLike = () => {
    if (authMode === "guest") {
      openAuthModal("login");
    } else {
      toggleLike(currentSong);
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] bg-zinc-950/95 backdrop-blur-3xl flex flex-col justify-between p-6 sm:p-12 overflow-hidden animate-fade-in select-none">
      {/* Background Dynamic Ambient Art Glow */}
      <div
        className="absolute inset-0 opacity-20 blur-3xl pointer-events-none scale-125 transition-all duration-1000"
        style={{
          backgroundImage: `url(${currentSong.artwork || "/aruvi-play.png"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <button
          onClick={toggleExpanded}
          className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/60 hover:bg-zinc-800 transition-colors border border-zinc-800"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 justify-center">
            <Sparkles className="w-3 h-3" /> Playing from Aruvi Play
          </span>
          <h3 className="text-xs font-semibold text-zinc-400 mt-0.5 truncate max-w-xs">{currentSong.album || "Single"}</h3>
        </div>

        <button
          onClick={onOpenQueue}
          className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900/60 hover:bg-zinc-800 transition-colors border border-zinc-800"
          title="Queue"
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {/* Center Artwork & Equalizer */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-6">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 group">
          <img
            src={currentSong.artwork || "/aruvi-play.png"}
            alt={currentSong.title}
            className="w-full h-full object-cover shadow-2xl transition-transform duration-700 group-hover:scale-105"
          />

          {/* Equalizer Waveform Overlay */}
          {isPlaying && (
            <div className="absolute bottom-4 right-4 flex items-end gap-1 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl">
              <div className="w-1.5 h-6 bg-emerald-400 rounded-full animate-pulse" />
              <div className="w-1.5 h-8 bg-emerald-400 rounded-full animate-pulse delay-75" />
              <div className="w-1.5 h-4 bg-emerald-400 rounded-full animate-pulse delay-150" />
              <div className="w-1.5 h-7 bg-emerald-400 rounded-full animate-pulse delay-100" />
            </div>
          )}
        </div>

        {/* Title & Artist & Like */}
        <div className="mt-8 text-center max-w-lg w-full flex items-center justify-between px-4">
          <div className="text-left min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate tracking-tight">{currentSong.title}</h1>
            <p className="text-sm sm:text-base font-medium text-zinc-400 truncate mt-1">{currentSong.artist}</p>
          </div>

          <button
            onClick={handleLike}
            className={`p-3 rounded-full backdrop-blur-md border transition-all ${
              liked
                ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white"
            }`}
          >
            <Heart className={`w-6 h-6 ${liked ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>

      {/* Bottom Scrub Bar & Play Controls & Shortcuts */}
      <div className="relative z-10 max-w-2xl w-full mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={position}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />
          <div className="flex justify-between text-xs font-mono text-zinc-500 font-medium">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-between px-6">
          <button
            onClick={toggleShuffle}
            className={`p-2.5 rounded-full transition-colors ${
              isShuffle ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-white"
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button onClick={prev} className="text-zinc-300 hover:text-white p-2 transition-colors">
            <SkipBack className="w-7 h-7" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-2xl shadow-emerald-500/30 transition-transform active:scale-95"
          >
            {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
          </button>

          <button onClick={next} className="text-zinc-300 hover:text-white p-2 transition-colors">
            <SkipForward className="w-7 h-7" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-colors ${
              repeatMode !== "off" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-white"
            }`}
            title="Repeat Mode"
          >
            {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>

        {/* Desktop Keyboard Shortcuts Hint */}
        <div className="hidden sm:flex items-center justify-center gap-4 text-[11px] text-zinc-500 font-medium pt-2 border-t border-zinc-900">
          <span className="flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5 text-zinc-400" /> Desktop Shortcuts:
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300">Space</kbd> Play/Pause
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300">←</kbd> / <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300">→</kbd> Prev/Next
          </span>
        </div>
      </div>
    </div>
  );
};
