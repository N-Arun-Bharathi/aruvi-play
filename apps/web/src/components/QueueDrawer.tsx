import React from "react";
import { usePlayerStore } from "../store/playerStore";
import { useToastStore } from "../store/toastStore";
import {
  X,
  Trash2,
  Shuffle,
  Play,
  Music,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Clock,
} from "lucide-react";

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const {
    queue,
    currentIndex,
    currentSong,
    playSong,
    toggleShuffle,
    isShuffle,
    removeFromQueue,
    clearQueue,
    moveInQueue,
  } = usePlayerStore();
  const toast = useToastStore();

  if (!isOpen) return null;

  const nowPlaying = currentSong || queue[currentIndex];
  const upNext = queue.slice(currentIndex + 1);

  // Stats calculation
  const totalDurationSecs = queue.reduce((acc, song) => acc + (song.duration || 0), 0);
  const formattedTotalMinutes = Math.ceil(totalDurationSecs / 60);

  const handleClear = () => {
    clearQueue();
    toast.show("Cleared upcoming queue", "success");
  };

  const handleRemove = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    removeFromQueue(songId);
    toast.show("Removed track from queue", "info");
  };

  return (
    <div className="fixed inset-0 z-[9980] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800/80 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/90">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Music className="w-4 h-4 text-cyan-400" /> Playback Queue
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span>{queue.length} tracks</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500" /> ~{formattedTotalMinutes} mins
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isShuffle
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
              }`}
              title="Shuffle Queue"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            {upNext.length > 0 && (
              <button
                onClick={handleClear}
                className="p-2 rounded-xl border bg-zinc-900 text-zinc-400 hover:text-rose-400 border-zinc-800 hover:border-rose-500/30 text-xs font-semibold transition-all"
                title="Clear Upcoming Queue"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 custom-scrollbar">
          {/* NOW PLAYING */}
          {nowPlaying && (
            <div>
              <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Now Playing
              </div>
              <div className="flex items-center gap-3 p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl shadow-lg shadow-cyan-950/20">
                <img
                  src={nowPlaying.artwork || "/aruvi-play.png"}
                  alt={nowPlaying.title}
                  className="w-12 h-12 rounded-xl object-cover shadow-md border border-cyan-500/20"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{nowPlaying.title}</h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{nowPlaying.artist}</p>
                </div>
                <div className="flex items-center gap-1 px-1">
                  <div className="w-1 h-3.5 bg-cyan-400 rounded-full animate-pulse" />
                  <div className="w-1 h-5 bg-cyan-400 rounded-full animate-pulse delay-75" />
                  <div className="w-1 h-2.5 bg-cyan-400 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* UP NEXT */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Up Next</span>
              <span className="text-[11px] text-zinc-500 font-medium">{upNext.length} songs</span>
            </div>

            {upNext.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs leading-relaxed">
                Upcoming queue is empty. Smart auto-recommendations will keep playing continuously!
              </div>
            ) : (
              <div className="space-y-2">
                {upNext.map((song, idx) => {
                  const actualIndex = currentIndex + 1 + idx;
                  return (
                    <div
                      key={`${song.id}_${actualIndex}`}
                      onClick={() => playSong(song, queue)}
                      className="group flex items-center gap-3 p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 rounded-2xl transition-all cursor-pointer"
                    >
                      <img
                        src={song.artwork || "/aruvi-play.png"}
                        alt={song.title}
                        className="w-10 h-10 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                          {song.title}
                        </h5>
                        <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveInQueue(actualIndex, actualIndex - 1);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < upNext.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveInQueue(actualIndex, actualIndex + 1);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleRemove(e, song.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800"
                          title="Remove from Queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
