import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlaylistStore } from "../store/playlistStore";
import { usePlayerStore } from "../store/playerStore";
import { SongListRow } from "../components/SongListRow";
import { Play, Shuffle, Trash2, ArrowLeft, Disc } from "lucide-react";

interface PlaylistDetailViewProps {
  setActiveView?: (view: string) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ setActiveView }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playlists, activePlaylist, setActivePlaylist, deletePlaylist } = usePlaylistStore();
  const { playSong, toggleShuffle } = usePlayerStore();

  const currentPl = activePlaylist || (id ? playlists.find((p) => p.id === id) : null);

  useEffect(() => {
    if (!activePlaylist && id && playlists.length > 0) {
      const found = playlists.find((p) => p.id === id);
      if (found) setActivePlaylist(found);
    }
  }, [id, playlists, activePlaylist]);

  const handleBack = () => {
    navigate("/library/playlists");
    if (setActiveView) setActiveView("playlists");
  };

  if (!currentPl) {
    return (
      <div className="p-8 text-center my-16 space-y-4">
        <Disc className="w-12 h-12 text-zinc-600 mx-auto" />
        <h3 className="text-xl font-bold text-white">Playlist Not Found</h3>
        <button
          onClick={handleBack}
          className="px-5 py-2.5 bg-cyan-500 text-zinc-950 font-bold text-xs rounded-full shadow-lg"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (currentPl.songs.length > 0) {
      playSong(currentPl.songs[0], currentPl.songs);
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete playlist "${currentPl.name}"?`)) {
      deletePlaylist(currentPl.id);
      handleBack();
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Playlists
      </button>

      {/* Playlist Hero Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-b from-zinc-850 to-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-3xl">
        <img
          src={currentPl.cover_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"}
          alt={currentPl.name}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl object-cover shadow-2xl shrink-0"
        />
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
            {currentPl.is_public ? "Public Playlist" : "Private Playlist"}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{currentPl.name}</h1>
          <p className="text-xs text-zinc-400 max-w-xl">{currentPl.description || "Custom listening mix"}</p>
          <div className="text-xs text-zinc-500 pt-2 font-medium">
            {currentPl.songs?.length || 0} songs • Created by you
          </div>
        </div>
      </div>

      {/* Playlist Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayAll}
            disabled={!currentPl.songs || currentPl.songs.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-full shadow-lg shadow-cyan-400/30 transition-all hover:scale-105"
          >
            <Play className="w-4 h-4 fill-zinc-950" /> Play All
          </button>
          <button
            onClick={toggleShuffle}
            disabled={!currentPl.songs || currentPl.songs.length === 0}
            className="p-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"
            title="Shuffle Playlist"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleDelete}
          className="p-3 text-zinc-500 hover:text-rose-500 hover:bg-rose-950/20 rounded-full transition-colors"
          title="Delete Playlist"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Song list */}
      <div className="space-y-1">
        {(!currentPl.songs || currentPl.songs.length === 0) ? (
          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl space-y-2">
            <p className="text-xs font-semibold text-zinc-400">This playlist is currently empty.</p>
            <p className="text-[11px] text-zinc-600">Search for tracks and tap the "+" icon to add songs to this playlist.</p>
          </div>
        ) : (
          currentPl.songs.map((song, idx) => (
            <SongListRow key={song.id} song={song} index={idx} queue={currentPl.songs} />
          ))
        )}
      </div>
    </div>
  );
};
