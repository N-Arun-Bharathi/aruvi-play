import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePlayerStore } from "../store/playerStore";
import { getSongLyrics, LyricsData } from "@aruvi/shared";
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
  Mic2,
  Sparkles,
  RefreshCw,
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

  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [fullLyricsMode, setFullLyricsMode] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics whenever currentSong changes
  useEffect(() => {
    if (!currentSong) {
      setLyricsData(null);
      return;
    }

    let isMounted = true;
    setLoadingLyrics(true);
    getSongLyrics(currentSong.id, currentSong.title, currentSong.artist)
      .then((data) => {
        if (isMounted) setLyricsData(data);
      })
      .catch((err) => {
        console.warn("Failed to fetch lyrics:", err);
        if (isMounted) setLyricsData(null);
      })
      .finally(() => {
        if (isMounted) setLoadingLyrics(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentSong?.id, currentSong?.title, currentSong?.artist]);

  // Calculate current active lyric index from playback position
  const activeIndex = useMemo(() => {
    if (!lyricsData?.lines?.length || !lyricsData.synced) return -1;
    let idx = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      if (position >= lyricsData.lines[i].time - 0.3) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyricsData, position]);

  // Smoothly auto-scroll active lyric into view
  useEffect(() => {
    if (activeIndex >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector(
        `[data-lyric-index="${activeIndex}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeIndex]);

  if (!isExpanded || !currentSong) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleLyricClick = (time: number) => {
    if (lyricsData?.synced && time >= 0) {
      seekTo(time);
    }
  };

  const refetchLyrics = () => {
    if (!currentSong) return;
    setLoadingLyrics(true);
    getSongLyrics(currentSong.id, currentSong.title, currentSong.artist)
      .then((data) => setLyricsData(data))
      .catch(() => setLyricsData(null))
      .finally(() => setLoadingLyrics(false));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0C10] text-white flex flex-col justify-between overflow-hidden animate-fade-in">
      {/* Background Ambient Glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none blur-[120px] -z-10 transition-all duration-1000"
        style={{
          background: currentSong.artwork
            ? `radial-gradient(circle at center, #06b6d4 0%, transparent 70%)`
            : "radial-gradient(circle at center, #10b981 0%, transparent 70%)",
        }}
      />

      {/* Top Header Bar */}
      <header className="h-16 px-6 sm:px-8 flex items-center justify-between border-b border-zinc-850/80 bg-zinc-950/40 backdrop-blur-md">
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

        <div className="flex items-center gap-2 text-zinc-400">
          <button
            onClick={() => setFullLyricsMode(!fullLyricsMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              fullLyricsMode
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Lyrics Focus</span>
          </button>
        </div>
      </header>

      {/* Main Center Stage */}
      {fullLyricsMode ? (
        /* Fullscreen Focused Lyrics View */
        <main className="flex-1 max-w-4xl mx-auto w-full p-6 sm:p-10 flex flex-col items-center overflow-hidden">
          <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-850 mb-4">
            <div className="flex items-center gap-3">
              <img
                src={currentSong.artwork || "/aruvi-play.png"}
                alt={currentSong.title}
                className="w-12 h-12 rounded-xl object-cover shadow-md"
              />
              <div>
                <h3 className="text-sm font-bold text-white truncate">{currentSong.title}</h3>
                <p className="text-xs text-cyan-400 truncate">{currentSong.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lyricsData?.synced && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Synchronized
                </span>
              )}
              <button
                onClick={() => setFullLyricsMode(false)}
                className="p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                title="Exit Lyrics Focus"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={lyricsContainerRef}
            className="flex-1 w-full overflow-y-auto custom-scrollbar text-center py-12 px-4 space-y-6"
          >
            {loadingLyrics ? (
              <div className="py-20 flex flex-col items-center gap-3 text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <p className="text-xs font-semibold">Fetching synchronized lyrics...</p>
              </div>
            ) : !lyricsData || lyricsData.lines.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3 text-zinc-500">
                <Mic2 className="w-10 h-10 text-zinc-600" />
                <p className="text-sm font-bold text-white">No lyrics available for this track</p>
                <button
                  onClick={refetchLyrics}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-cyan-400 border border-zinc-800 rounded-full text-xs font-bold transition-all"
                >
                  Retry Search
                </button>
              </div>
            ) : (
              lyricsData.lines.map((line, idx) => {
                const isActive = lyricsData.synced && idx === activeIndex;
                return (
                  <p
                    key={idx}
                    data-lyric-index={idx}
                    onClick={() => handleLyricClick(line.time)}
                    className={`transition-all duration-300 select-none ${
                      lyricsData.synced ? "cursor-pointer" : ""
                    } ${
                      isActive
                        ? "text-2xl sm:text-3xl font-black text-cyan-300 scale-105 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                        : "text-base sm:text-lg font-bold text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })
            )}
          </div>
        </main>
      ) : (
        /* Standard 3-Column Center Main Stage */
        <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-10 max-w-7xl mx-auto w-full items-center overflow-y-auto custom-scrollbar">
          {/* Left Column: UP NEXT Queue */}
          <div className="space-y-4 hidden md:block max-h-[480px] overflow-y-auto custom-scrollbar pr-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-2">
              Up Next
            </h3>

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

          {/* Right Column: Live Synchronized Lyrics Stage */}
          <div className="space-y-4 hidden md:flex flex-col h-[480px] bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl overflow-hidden relative backdrop-blur-sm">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  {lyricsData?.synced ? "Synced Lyrics" : "Lyrics"}
                </h3>
              </div>
              <button
                onClick={() => setFullLyricsMode(true)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Full Lyrics Focus"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={lyricsContainerRef}
              className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pr-2 py-4"
            >
              {loadingLyrics ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                  <p className="text-xs font-medium">Fetching live lyrics...</p>
                </div>
              ) : !lyricsData || lyricsData.lines.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-500 text-center px-4">
                  <p className="text-xs font-semibold text-zinc-400">No lyrics found for this song</p>
                  <p className="text-[11px] text-zinc-600">Lyrics load automatically when available from online providers.</p>
                </div>
              ) : (
                lyricsData.lines.map((line, idx) => {
                  const isActive = lyricsData.synced && idx === activeIndex;
                  return (
                    <p
                      key={idx}
                      data-lyric-index={idx}
                      onClick={() => handleLyricClick(line.time)}
                      className={`text-xs font-bold transition-all duration-300 select-none ${
                        lyricsData.synced ? "cursor-pointer" : ""
                      } ${
                        isActive
                          ? "text-white scale-105 border-l-2 border-cyan-400 pl-3 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                          : "text-zinc-500 hover:text-zinc-300 pl-1"
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })
              )}
            </div>
          </div>
        </main>
      )}

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
          <button
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-colors ${
              repeatMode !== "off"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Repeat className="w-4 h-4" />
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

