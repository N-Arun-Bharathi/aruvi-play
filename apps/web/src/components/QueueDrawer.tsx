import React from "react";
import { usePlayerStore } from "../store/playerStore";
import { X, Trash2, Shuffle, Play, Music, GripVertical } from "lucide-react";

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const { queue, currentIndex, currentSong, playSong, toggleShuffle, isShuffle } = usePlayerStore();

  if (!isOpen) return null;

  const nowPlaying = currentSong || queue[currentIndex];
  const upNext = queue.slice(currentIndex + 1);

  return (
    <div className="fixed inset-0 z-[9980] flex justify-end bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-[#0b1329] border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in backdrop-blur-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70 backdrop-blur-xl">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Playback Queue</h2>
            <p className="text-xs text-slate-400">{queue.length} tracks queued</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isShuffle
                  ? "bg-gradient-to-r from-[#38bdf8]/20 to-[#2563eb]/20 text-[#38bdf8] border-[#38bdf8]/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" /> Shuffle
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* NOW PLAYING */}
          {nowPlaying && (
            <div>
              <div className="text-xs font-bold text-[#38bdf8] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Music className="w-3.5 h-3.5" /> Now Playing
              </div>
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-800/90 via-slate-800/70 to-slate-900/90 border border-slate-700/60 rounded-2xl shadow-lg backdrop-blur-md">
                <img
                  src={nowPlaying.artwork || "/aruvi-play.png"}
                  alt={nowPlaying.title}
                  className="w-12 h-12 rounded-xl object-cover shadow-md border border-slate-700/50"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{nowPlaying.title}</h4>
                  <p className="text-xs text-slate-400 truncate">{nowPlaying.artist}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-[#38bdf8] rounded-full animate-pulse" />
                  <div className="w-1 h-4 bg-[#38bdf8] rounded-full animate-pulse delay-75" />
                  <div className="w-1 h-2 bg-[#38bdf8] rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* UP NEXT */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Up Next</span>
              <span className="text-[11px] text-slate-500 font-medium">{upNext.length} songs</span>
            </div>

            {upNext.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-700/60 rounded-2xl text-slate-400 text-xs bg-slate-900/40 backdrop-blur-sm">
                Queue is empty. Smart recommendations will auto-load on next track!
              </div>
            ) : (
              <div className="space-y-2">
                {upNext.map((song, idx) => (
                  <div
                    key={`${song.id}_${idx}`}
                    onClick={() => playSong(song, queue)}
                    className="group flex items-center gap-3 p-2.5 bg-slate-900/70 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all cursor-pointer backdrop-blur-md"
                  >
                    <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                    <img
                      src={song.artwork || "/aruvi-play.png"}
                      alt={song.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-white group-hover:text-[#38bdf8] truncate">
                        {song.title}
                      </h5>
                      <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                    </div>
                    <button className="p-1.5 text-slate-400 hover:text-[#38bdf8] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
