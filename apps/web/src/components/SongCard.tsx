import React from "react";
import { Song } from "@aruvi/shared";
import { usePlayerStore } from "../store/playerStore";
import { useLikedStore } from "../store/likedStore";
import { useAuthStore } from "../store/authStore";
import { usePlaylistStore } from "../store/playlistStore";
import { Play, Heart, Plus } from "lucide-react";

interface SongCardProps {
  song: Song;
  queue?: Song[];
}

export const SongCard: React.FC<SongCardProps> = ({ song, queue }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();
  const { authMode, openAuthModal } = useAuthStore();
  const { playlists, addSongToPlaylist } = usePlaylistStore();

  const isCurrent = currentSong?.id === song.id;
  const liked = isLiked(song.id);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      className="group relative bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-750 p-3.5 rounded-2xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between"
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-zinc-950">
        <img
          src={song.artwork || "/aruvi-play.png"}
          alt={song.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Play Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 flex items-center justify-center ${
            isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={handlePlay}
            className="w-11 h-11 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-xl transform transition-transform group-hover:scale-105 hover:bg-emerald-400"
          >
            {isCurrent && isPlaying ? (
              <div className="flex items-center gap-1">
                <div className="w-1 h-4 bg-zinc-950 rounded-full animate-pulse" />
                <div className="w-1 h-5 bg-zinc-950 rounded-full animate-pulse delay-75" />
                <div className="w-1 h-3 bg-zinc-950 rounded-full animate-pulse delay-150" />
              </div>
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Heart Like Quick Action */}
        <button
          onClick={handleLike}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all ${
            liked
              ? "bg-rose-500/20 text-rose-500"
              : "bg-black/40 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <h4
          className={`font-bold text-sm truncate tracking-tight ${
            isCurrent ? "text-emerald-400" : "text-white group-hover:text-emerald-300"
          }`}
        >
          {song.title}
        </h4>
        <p className="text-xs text-zinc-400 truncate mt-0.5">{song.artist}</p>
      </div>
    </div>
  );
};
