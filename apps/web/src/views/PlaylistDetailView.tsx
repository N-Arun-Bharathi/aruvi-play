import React from "react";
import { usePlaylistStore } from "../store/playlistStore";
import { usePlayerStore } from "../store/playerStore";
import { SongListRow } from "../components/SongListRow";
import { Play, Shuffle, Trash2, ArrowLeft, Disc } from "lucide-react";

interface PlaylistDetailViewProps {
  setActiveView: (view: string) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ setActiveView }) => {
  const { activePlaylist, deletePlaylist } = usePlaylistStore();
  const { playSong, toggleShuffle } = usePlayerStore();

  if (!activePlaylist) {
    return (
      <div className="p-8 text-center my-16 space-y-4">
        <Disc className="w-12 h-12 text-zinc-600 mx-auto" />
        <h3 className="text-xl font-bold text-white">No Playlist Selected</h3>
        <button
          onClick={() => setActiveView("playlists")}
          className="px-5 py-2.5 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-full"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (activePlaylist.songs.length > 0) {
      playSong(activePlaylist.songs[0], activePlaylist.songs);
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete playlist "${activePlaylist.name}"?`)) {
      deletePlaylist(activePlaylist.id);
      setActiveView("playlists");
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Back button */}
      <button
        onClick={() => setActiveView("playlists")}
        className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Playlists
      </button>

      {/* Playlist Hero Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-b from-zinc-850 to-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-3xl">
        <img
          src={activePlaylist.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"}
          alt={activePlaylist.name}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl object-cover shadow-2xl shrink-0"
        />
        <div className="space-y-2 text-center sm:text-left flex-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Playlist</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{activePlaylist.name}</h1>
          <p className="text-xs text-zinc-400">{activePlaylist.description || "No description provided."}</p>
          <div className="text-xs text-zinc-500 font-medium pt-1">{activePlaylist.songs.length} songs</div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-4">
            <button
              onClick={handlePlayAll}
              disabled={activePlaylist.songs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-full shadow-lg transition-all"
            >
              <Play className="w-4 h-4 fill-current" /> Play All
            </button>
            <button
              onClick={handleDelete}
              className="p-3 text-zinc-400 hover:text-rose-400 bg-zinc-900 border border-zinc-800 rounded-full transition-colors"
              title="Delete Playlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Song List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-300">Songs in Playlist</h3>
        {activePlaylist.songs.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl text-zinc-500 text-xs">
            No songs added yet. Click "+" on any song card or row to add it here!
          </div>
        ) : (
          <div className="space-y-1">
            {activePlaylist.songs.map((song, idx) => (
              <SongListRow key={`${song.id}_${idx}`} song={song} index={idx} queue={activePlaylist.songs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
