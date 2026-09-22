import React, { useState } from "react";
import { Song } from "@aruvi/shared";
import { usePlayerStore } from "../store/playerStore";
import { useLikedStore } from "../store/likedStore";
import { useAuthStore } from "../store/authStore";
import { usePlaylistStore } from "../store/playlistStore";
import { Play, Heart, Plus, Music } from "lucide-react";

interface SongListRowProps {
  song: Song;
  index: number;
  queue?: Song[];
}

export const SongListRow: React.FC<SongListRowProps> = ({ song, index, queue }) => {
  const { currentSong, playSong, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();
  const { authMode, openAuthModal } = useAuthStore();
  const { playlists, addSongToPlaylist } = usePlaylistStore();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  const isCurrent = currentSong?.id === song.id;
  const liked = isLiked(song.id);

  const formatDuration = (secs?: number) => {
    if (!secs) return "3:45";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, queue);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authMode === "guest") {
      openAuthModal("login");
    } else {
      toggleLike(song);
    }
  };

  return (
    <div
      onClick={handlePlay}
      className={`group relative flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-xl transition-all cursor-pointer select-none ${
        isCurrent
          ? "bg-gradient-to-r from-sky-500/20 to-blue-600/10 border border-sky-400/40 shadow-sm shadow-sky-500/15 text-sky-400"
          : "hover:bg-slate-800/60 text-slate-200"
      }`}
    >
      {/* Left Index & Artwork & Title */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <span className="w-5 text-center text-xs font-semibold text-slate-400 group-hover:hidden">
          {isCurrent ? <Music className="w-4 h-4 text-sky-400 mx-auto animate-pulse" /> : index + 1}
        </span>
        <button
          onClick={handlePlay}
          className="w-5 hidden group-hover:flex items-center justify-center text-white hover:text-sky-400 transition-colors"
        >
          <Play className="w-4 h-4 fill-current" />
        </button>

        <img
          src={song.artwork || "/aruvi-play.png"}
          alt={song.title}
          className="w-10 h-10 rounded-lg object-cover bg-slate-900 shrink-0 border border-white/10 shadow-sm"
        />

        <div className="min-w-0 flex-1">
          <h4 className={`text-sm font-semibold truncate ${isCurrent ? "text-sky-400 font-bold" : "text-slate-100 group-hover:text-white"}`}>
            {song.title}
          </h4>
          <p className="text-xs text-slate-400 truncate">{song.artist}</p>
        </div>
      </div>

      {/* Album (hidden on mobile) */}
      <div className="hidden md:block w-1/3 min-w-0 px-4">
        <span className="text-xs text-slate-400 truncate block">{song.album || "Single"}</span>
      </div>

      {/* Right Duration & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleLike}
          className={`p-1.5 rounded-full transition-colors ${
            liked ? "text-rose-400" : "text-slate-400 hover:text-white opacity-0 group-hover:opacity-100"
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
        </button>

        {/* Add to Playlist Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (authMode === "guest") {
                openAuthModal("login");
              } else {
                setShowPlaylistMenu(!showPlaylistMenu);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title="Add to Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>

          {showPlaylistMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-2 w-48 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-slide-in backdrop-blur-2xl"
            >
              <div className="text-[10px] font-bold text-sky-400 uppercase px-2 py-1">Add to Playlist</div>
              {playlists.length === 0 ? (
                <div className="text-xs text-slate-400 px-2 py-1">No playlists yet</div>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      addSongToPlaylist(pl.id, song);
                      setShowPlaylistMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg truncate transition-colors"
                  >
                    {pl.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <span className="text-xs text-slate-500 font-mono w-10 text-right">{formatDuration(song.duration)}</span>
      </div>
    </div>
  );
};
