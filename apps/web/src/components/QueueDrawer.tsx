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
    <div className="fixed inset-0 z-[9980] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800/80 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/90">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Playback Queue</h2>
            <p className="text-xs text-zinc-400">{queue.length} tracks queued</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isShuffle
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" /> Shuffle
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
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
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Music className="w-3.5 h-3.5" /> Now Playing
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
                <img
                  src={nowPlaying.artwork || "/aruvi-play.png"}
                  alt={nowPlaying.title}
                  className="w-12 h-12 rounded-xl object-cover shadow-md"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{nowPlaying.title}</h4>
                  <p className="text-xs text-zinc-400 truncate">{nowPlaying.artist}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse" />
                  <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse delay-75" />
                  <div className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* UP NEXT */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Up Next</span>
              <span className="text-[11px] text-zinc-500 font-medium">{upNext.length} songs</span>
            </div>

            {upNext.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                Queue is empty. Smart recommendations will auto-load on next track!
              </div>
            ) : (
              <div className="space-y-2">
                {upNext.map((song, idx) => (
                  <div
                    key={`${song.id}_${idx}`}
                    onClick={() => playSong(song, queue)}
                    className="group flex items-center gap-3 p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 rounded-xl transition-all cursor-pointer"
                  >
                    <GripVertical className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                    <img
                      src={song.artwork || "/aruvi-play.png"}
                      alt={song.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {song.title}
                      </h5>
                      <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                    </div>
                    <button className="p-1.5 text-zinc-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
