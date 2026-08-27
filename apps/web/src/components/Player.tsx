import React from "react";
import { usePlayerStore } from "../store/playerStore";
import { useLikedStore } from "../store/likedStore";
import { useAuthStore } from "../store/authStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  ListMusic,
  Maximize2,
  Volume2,
  VolumeX,
} from "lucide-react";

interface PlayerProps {
  onOpenQueue: () => void;
}

export const Player: React.FC<PlayerProps> = ({ onOpenQueue }) => {
  const {
    currentSong,
    isPlaying,
    position,
    duration,
    volume,
    isMuted,
    togglePlay,
    next,
    prev,
    seekTo,
    setVolume,
    toggleMute,
    toggleExpanded,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLikedStore();
  const { authMode, openAuthModal } = useAuthStore();

  if (!currentSong) return null;

  const liked = isLiked(currentSong.id);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  const handleLike = () => {
    if (authMode === "guest") {
      openAuthModal("login");
    } else {
      toggleLike(currentSong);
    }
  };

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 h-20 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between z-40 shadow-2xl select-none">
      {/* Left Track Info */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-0">
        <div
          onClick={toggleExpanded}
          className="relative group w-12 h-12 rounded-xl overflow-hidden shrink-0 cursor-pointer shadow-md bg-zinc-900"
        >
          <img
            src={currentSong.artwork || "/aruvi-play.png"}
            alt={currentSong.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h4
            onClick={toggleExpanded}
            className="text-sm font-bold text-white hover:text-emerald-400 truncate cursor-pointer transition-colors"
          >
            {currentSong.title}
          </h4>
          <p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
        </div>

        <button
          onClick={handleLike}
          className={`p-1.5 rounded-full transition-colors hidden sm:block ${
            liked ? "text-rose-500" : "text-zinc-500 hover:text-white"
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Middle Controls & Progress Bar */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-4">
        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={prev}
            className="text-zinc-400 hover:text-white p-1 transition-colors"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg transition-transform active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={next}
            className="text-zinc-400 hover:text-white p-1 transition-colors"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Scrub Bar */}
        <div className="w-full flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <span>{formatTime(position)}</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={position}
              onChange={handleSeekChange}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Volume & Queue & Expand */}
      <div className="flex items-center justify-end gap-3 w-1/4">
        {/* Volume Slider (hidden on small mobile) */}
        <div className="hidden lg:flex items-center gap-2">
          <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />
        </div>

        {/* Queue Button */}
        <button
          onClick={onOpenQueue}
          className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
          title="Playback Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Maximize Button */}
        <button
          onClick={toggleExpanded}
          className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors hidden sm:block"
          title="Expand Player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
