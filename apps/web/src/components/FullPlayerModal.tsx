import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePlayerStore } from "../store/playerStore";
import { getSongLyrics, LyricsData } from "@aruvi/shared";
import {
  ChevronDown,
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
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#0a0f1d] via-[#0f172a] to-[#131f38] text-slate-100 flex flex-col justify-between overflow-hidden animate-fade-in">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#38bdf8]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-[#2563eb]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-[#0ea5e9]/15 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-16 px-6 sm:px-8 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleExpanded}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-black text-[#38bdf8] text-base tracking-widest">A</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Now Playing</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <button
            onClick={() => setFullLyricsMode(!fullLyricsMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              fullLyricsMode
                ? "bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/40 shadow-sm shadow-[#38bdf8]/20"
                : "bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white"
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
        <main className="flex-1 max-w-4xl mx-auto w-full p-6 sm:p-10 flex flex-col items-center overflow-hidden z-10">
          <div className="w-full flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-3">
              <img
                src={currentSong.artwork || "/aruvi-play.png"}
                alt={currentSong.title}
                className="w-12 h-12 rounded-xl object-cover shadow-md border border-slate-700/50"
              />
              <div>
                <h3 className="text-sm font-bold text-white truncate">{currentSong.title}</h3>
                <p className="text-xs text-[#38bdf8] truncate">{currentSong.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lyricsData?.synced && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[10px] font-extrabold text-[#38bdf8] uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3 h-3" /> Synchronized
                </span>
              )}
              <button
                onClick={() => setFullLyricsMode(false)}
                className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700"
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
              <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-[#38bdf8]" />
                <p className="text-xs font-semibold">Fetching synchronized lyrics...</p>
              </div>
            ) : !lyricsData || lyricsData.lines.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
                <Mic2 className="w-10 h-10 text-slate-500" />
                <p className="text-sm font-bold text-white">No lyrics available for this track</p>
                <button
                  onClick={refetchLyrics}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-[#38bdf8] border border-slate-700 rounded-full text-xs font-bold transition-all shadow-sm"
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
                        ? "text-2xl sm:text-3xl font-black text-white scale-105 drop-shadow-[0_0_20px_rgba(56,189,248,0.7)]"
                        : "text-base sm:text-lg font-bold text-slate-400 hover:text-white"
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
        <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-10 max-w-7xl mx-auto w-full items-center overflow-y-auto custom-scrollbar z-10">
          {/* Left Column: UP NEXT Queue */}
          <div className="space-y-4 hidden md:block max-h-[480px] overflow-y-auto custom-scrollbar pr-2 bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl backdrop-blur-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
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
                        ? "bg-slate-800 border border-[#38bdf8]/50 text-white shadow-lg shadow-[#38bdf8]/15"
                        : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={song.artwork || "/aruvi-play.png"}
                        alt={song.title}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold truncate text-white">{song.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono ml-2">
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
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl shadow-slate-950/80 border border-slate-700/60">
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
              <p className="text-sm font-bold text-[#38bdf8]">
                {currentSong.artist}
              </p>
            </div>

            {/* Animated Waveform Equalizer */}
            <div className="flex items-end justify-center gap-1 h-10 w-48">
              {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 65, 35, 75, 55, 85].map((val, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-[#38bdf8] via-[#0ea5e9] to-[#2563eb] rounded-full transition-all duration-300"
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
                className="w-full h-2 bg-slate-800 accent-[#38bdf8] rounded-lg cursor-pointer hover:accent-[#0ea5e9] transition-all"
              />
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Synchronized Lyrics Stage */}
          <div className="space-y-4 hidden md:flex flex-col h-[480px] bg-slate-900/75 border border-slate-800/80 p-6 rounded-3xl overflow-hidden relative backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-[#38bdf8]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {lyricsData?.synced ? "Synced Lyrics" : "Lyrics"}
                </h3>
              </div>
              <button
                onClick={() => setFullLyricsMode(true)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
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
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#38bdf8]" />
                  <p className="text-xs font-medium">Fetching live lyrics...</p>
                </div>
              ) : !lyricsData || lyricsData.lines.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-center px-4">
                  <p className="text-xs font-semibold text-white">No lyrics found for this song</p>
                  <p className="text-[11px] text-slate-500">Lyrics load automatically when available from online providers.</p>
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
                          ? "text-white scale-105 border-l-2 border-[#38bdf8] pl-3 drop-shadow-[0_0_12px_rgba(56,189,248,0.7)] font-black"
                          : "text-slate-400 hover:text-white pl-1"
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
      <footer className="h-20 border-t border-slate-800/80 px-8 flex items-center justify-between bg-slate-950/85 backdrop-blur-2xl z-10">
        {/* Left Toggles */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleExpanded}
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleShuffle}
            className={`p-2.5 rounded-full transition-colors ${
              isShuffle ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40" : "text-slate-400 hover:text-white"
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-colors ${
              repeatMode !== "off"
                ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Center Main Controls */}
        <div className="flex items-center gap-6">
          <button onClick={prev} className="text-slate-400 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#38bdf8] to-[#2563eb] hover:from-[#0ea5e9] hover:to-[#1d4ed8] text-slate-950 flex items-center justify-center shadow-xl shadow-[#38bdf8]/30 hover:scale-105 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-slate-950" />
            ) : (
              <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
            )}
          </button>

          <button onClick={next} className="text-slate-400 hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right Volume Control */}
        <div className="flex items-center gap-3">
          <button onClick={toggleMute} className="text-slate-400 hover:text-white">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-[#38bdf8] h-1.5 rounded-lg bg-slate-800 cursor-pointer"
          />
        </div>
      </footer>
    </div>
  );
};
