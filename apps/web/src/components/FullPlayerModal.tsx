import React, { useState } from "react";
import { usePlayerStore } from "../store/playerStore";
import { useLikedStore } from "../store/likedStore";
import { usePlaylistStore } from "../store/playlistStore";
import { useTimerStore } from "../store/timerStore";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Heart,
  Clock,
  Share2,
  Plus,
  ListMusic,
} from "lucide-react";

interface FullPlayerModalProps {
  onOpenQueue?: () => void;
}

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({ onOpenQueue }) => {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    next,
    prev,
    queue,
    playSong,
    isExpanded,
    toggleExpanded,
    position,
    duration,
    seekTo,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLikedStore();
  const { playlists, addSongToPlaylist, createPlaylist } = usePlaylistStore();
  const { timeLeft, timerActive, setTimer } = useTimerStore();
  const { authMode, openAuthModal } = useAuthStore();
  const toast = useToastStore();

  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [newPlName, setNewPlName] = useState("");

  if (!isExpanded || !currentSong) return null;

  const liked = isLiked(currentSong);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authMode === "guest") {
      openAuthModal("login");
    } else {
      toggleLike(currentSong);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentSong.title,
        text: `Listening to "${currentSong.title}" by ${currentSong.artist} on Aruvi Play! 🎧`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `Listening to "${currentSong.title}" by ${currentSong.artist} on Aruvi Play! 🎧`
      );
      toast.show("Song info copied to clipboard!", "success");
    }
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    const pl = createPlaylist(newPlName.trim());
    addSongToPlaylist(pl.id, currentSong);
    setNewPlName("");
    setShowPlaylistMenu(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0F1115] text-white flex flex-col justify-between overflow-hidden animate-fade-in">
      {/* Top Header Bar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-zinc-850 bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleExpanded}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
            title="Minimize"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-black text-cyan-400 text-base tracking-widest">A</span>
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Now Playing</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 text-zinc-400">
          {/* Sleep Timer */}
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className={`p-2 rounded-full transition-colors flex items-center gap-1.5 ${
                timerActive ? "text-cyan-400 bg-cyan-500/20 border border-cyan-500/30" : "hover:text-white hover:bg-zinc-850"
              }`}
              title="Sleep Timer"
            >
              <Clock className="w-4 h-4" />
              {timerActive && timeLeft !== null && (
                <span className="text-xs font-mono">{Math.ceil(timeLeft / 60)}m</span>
              )}
            </button>

            {showTimerMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-slide-in">
                <div className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">Sleep Timer</div>
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setTimer(mins);
                      setShowTimerMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-850 rounded-lg transition-colors"
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

          {/* Add to Playlist */}
          <div className="relative">
            <button
              onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
              className="p-2 hover:text-white hover:bg-zinc-850 rounded-full transition-colors"
              title="Add to Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>

            {showPlaylistMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 animate-slide-in space-y-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase px-1">Add to Playlist</div>
                <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        addSongToPlaylist(pl.id, currentSong);
                        setShowPlaylistMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg truncate transition-colors"
                    >
                      {pl.name}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleCreateAndAdd} className="pt-2 border-t border-zinc-800 flex gap-1.5">
                  <input
                    type="text"
                    value={newPlName}
                    onChange={(e) => setNewPlName(e.target.value)}
                    placeholder="New playlist..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                  />
                  <button type="submit" className="px-2.5 py-1.5 bg-cyan-400 text-zinc-950 text-xs font-bold rounded-lg">
                    +
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-2 hover:text-white hover:bg-zinc-850 rounded-full transition-colors"
            title="Share Song"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3-Column Center Main Stage */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-10 max-w-7xl mx-auto w-full items-center overflow-y-auto custom-scrollbar">
        {/* Left Column: UP NEXT Queue */}
        <div className="space-y-4 hidden md:block max-h-[480px] overflow-y-auto custom-scrollbar pr-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Up Next ({queue.length})
            </h3>
            {onOpenQueue && (
              <button
                onClick={onOpenQueue}
                className="text-xs text-cyan-400 font-bold hover:underline"
              >
                Full Queue
              </button>
            )}
          </div>

          <div className="space-y-2">
            {queue.slice(0, 8).map((song) => {
              const isSelected = song.id === currentSong.id;
              return (
                <div
                  key={song.id}
                  onClick={() => playSong(song, queue)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-zinc-850 border border-zinc-750 text-white shadow-lg"
                      : "hover:bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={song.artwork || "/aruvi-play.png"}
                      alt={song.title}
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold truncate">{song.title}</h4>
                      <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono ml-2">
                    {formatTime(song.duration || 240)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Album Art & Track Controls */}
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          {/* Main Album Artwork */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/10 border border-zinc-800 group">
            <img
              src={currentSong.artwork || "/aruvi-play.png"}
              alt={currentSong.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          {/* Track Details & Like Button */}
          <div className="flex items-center justify-center gap-3 w-full max-w-md px-4">
            <div className="space-y-1 min-w-0 flex-1 text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                {currentSong.title}
              </h2>
              <p className="text-sm font-bold text-cyan-400 truncate">
                {currentSong.artist}
              </p>
            </div>
            <button
              onClick={handleLike}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                liked
                  ? "bg-rose-500/20 text-rose-500"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
              title={liked ? "Remove from Liked" : "Save to Liked"}
            >
              <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* Animated Waveform */}
          <div className="flex items-end justify-center gap-1 h-8 w-48">
            {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 65, 35, 75, 55, 85].map((val, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{
                  height: isPlaying ? `${Math.max(15, (val * (i % 3 === 0 ? 0.9 : 1.2)) % 100)}%` : "20%",
                }}
              />
            ))}
          </div>

          {/* Seek Bar Slider */}
          <div className="w-full max-w-md space-y-2">
            <input
              type="range"
              min="0"
              max={duration && duration > 0 ? duration : 100}
              step="0.1"
              value={position}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="w-full h-2 bg-zinc-800 accent-cyan-400 rounded-lg cursor-pointer hover:accent-cyan-300 transition-all"
            />
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Lyrics & Song Information */}
        <div className="space-y-4 hidden md:block max-h-[480px] overflow-y-auto custom-scrollbar pl-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Song Info & Lyrics
            </h3>
            <Maximize2 className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer" />
          </div>

          <div className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-2xl space-y-3 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Album:</span>
              <span className="text-white font-medium">{currentSong.album || "Single"}</span>
            </div>
            {currentSong.language && (
              <div className="flex justify-between text-zinc-400">
                <span>Language:</span>
                <span className="text-white font-medium capitalize">{currentSong.language}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <span>Source:</span>
              <span className="text-cyan-400 font-medium capitalize">{currentSong.source || "online"}</span>
            </div>
          </div>

          <div className="space-y-3 py-2">
            {[
              "City lights reflecting in the breeze",
              "Melodies flow with effortless ease",
              "Night vibes in high definition sound",
              "Music playing all around",
            ].map((line, idx) => (
              <p
                key={idx}
                className={`text-sm font-semibold transition-all ${
                  idx === 1
                    ? "text-white font-bold border-l-2 border-cyan-400 pl-3 scale-105"
                    : "text-zinc-500"
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Player Navigation Controls */}
      <footer className="h-20 border-t border-zinc-850 px-8 flex items-center justify-between bg-zinc-950/60">
        {/* Left Toggles: Minimize, Shuffle, Repeat */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleExpanded}
            className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleShuffle}
            className={`p-2.5 rounded-full transition-colors ${
              isShuffle ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-zinc-400 hover:text-white"
            }`}
            title={isShuffle ? "Shuffle On" : "Shuffle Off"}
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-colors ${
              repeatMode !== "off" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-zinc-400 hover:text-white"
            }`}
            title={
              repeatMode === "off"
                ? "Repeat Off"
                : repeatMode === "all"
                ? "Repeat All"
                : "Repeat Current Track"
            }
          >
            {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Center Main Controls */}
        <div className="flex items-center gap-6">
          <button onClick={prev} className="text-zinc-300 hover:text-white transition-colors p-2" title="Previous">
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-cyan-400 text-zinc-950 flex items-center justify-center shadow-xl shadow-cyan-400/40 hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-zinc-950" />
            ) : (
              <Play className="w-6 h-6 fill-zinc-950 ml-0.5" />
            )}
          </button>

          <button onClick={next} className="text-zinc-300 hover:text-white transition-colors p-2" title="Next">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right Controls: Volume & Queue */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white p-1.5" title="Volume">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-cyan-400 h-1.5 rounded-lg bg-zinc-800 cursor-pointer"
            />
          </div>

          {onOpenQueue && (
            <button
              onClick={onOpenQueue}
              className="p-2 text-zinc-400 hover:text-cyan-400 rounded-full hover:bg-zinc-850 transition-colors"
              title="Open Queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
