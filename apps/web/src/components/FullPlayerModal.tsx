import React, { useState } from "react";
import { usePlayerStore } from "../store/playerStore";
import {
  ChevronDown,
  Cast,
  MoreVertical,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
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
    currentIndex,
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

  if (!isExpanded || !currentSong) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const sampleLyrics = [
    "City lights reflecting in my eyes",
    "Highway lines pass me by",
    "I'm on a midnight drive",
    "No destination, just alive",
    "Synth beats pulsing in my veins",
    "Washing away all the pain",
    "Neon glow fading to black",
    "Ain't never looking back",
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0F1115] text-white flex flex-col justify-between overflow-hidden animate-fade-in">
      {/* Top Header Bar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-zinc-850 bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleExpanded}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-black text-cyan-400 text-base tracking-widest">A</span>
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Now Playing</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-zinc-400">
          <button className="p-2 hover:text-white transition-colors">
            <Cast className="w-4 h-4" />
          </button>
          <button className="p-2 hover:text-white transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3-Column Center Main Stage */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-10 max-w-7xl mx-auto w-full items-center overflow-y-auto custom-scrollbar">
        {/* Left Column: UP NEXT Queue */}
        <div className="space-y-4 hidden md:block max-h-[480px] overflow-y-auto custom-scrollbar pr-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-2">
            Up Next
          </h3>

          <div className="space-y-2">
            {queue.slice(0, 8).map((song, idx) => {
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
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/10 border border-zinc-800">
            <img
              src={currentSong.artwork || "/aruvi-play.png"}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Track Details */}
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentSong.title}
            </h2>
            <p className="text-sm font-bold text-cyan-400">
              {currentSong.artist}
            </p>
          </div>

          {/* Animated Cyan Waveform Equalizer */}
          <div className="flex items-end justify-center gap-1 h-10 w-48">
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
              onInput={(e) => seekTo(parseFloat((e.target as HTMLInputElement).value))}
              className="w-full h-2 bg-zinc-800 accent-cyan-400 rounded-lg cursor-pointer hover:accent-cyan-300 transition-all"
            />
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Synchronized Lyrics */}
        <div className="space-y-4 hidden md:block max-h-[480px] overflow-y-auto custom-scrollbar pl-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Lyrics
            </h3>
            <Maximize2 className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer" />
          </div>

          <div className="space-y-4 py-4">
            {sampleLyrics.map((line, idx) => {
              const isActive = idx === 2 || idx === 3;
              return (
                <p
                  key={idx}
                  className={`text-sm font-extrabold transition-all ${
                    isActive
                      ? "text-white scale-105 border-l-2 border-cyan-400 pl-3"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Player Navigation Controls */}
      <footer className="h-20 border-t border-zinc-850 px-8 flex items-center justify-between bg-zinc-950/60">
        {/* Left Toggles */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleExpanded}
            className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleShuffle}
            className={`p-2.5 rounded-full transition-colors ${
              isShuffle ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Center Main Controls */}
        <div className="flex items-center gap-6">
          <button onClick={prev} className="text-zinc-300 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-cyan-400 text-zinc-950 flex items-center justify-center shadow-xl shadow-cyan-400/40 hover:scale-105 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-zinc-950" />
            ) : (
              <Play className="w-6 h-6 fill-zinc-950 ml-0.5" />
            )}
          </button>

          <button onClick={next} className="text-zinc-300 hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right Volume Control */}
        <div className="flex items-center gap-3">
          <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
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
      </footer>
    </div>
  );
};
