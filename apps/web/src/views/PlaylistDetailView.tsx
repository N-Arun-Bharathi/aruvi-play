import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlaylistStore } from "../store/playlistStore";
import { usePlayerStore } from "../store/playerStore";
import { SongListRow } from "../components/SongListRow";
import { Play, Trash2, ArrowLeft, Disc, Loader2 } from "lucide-react";

interface PlaylistDetailViewProps {
  setActiveView?: (view: string) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ setActiveView }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { playlists, activePlaylist, setActivePlaylist, loadSaavnPlaylist, deletePlaylist } =
    usePlaylistStore();
  const { playSong } = usePlayerStore();

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!id) return;

    // If activePlaylist already matches the requested route ID, do nothing
    if (activePlaylist && activePlaylist.id === id) {
      setLoading(false);
      setLoadError(false);
      return;
    }

    // 1. Check local custom playlists
    const foundLocal = playlists.find((p) => p.id === id);
    if (foundLocal) {
      setActivePlaylist(foundLocal);
      setLoading(false);
      setLoadError(false);
      return;
    }

    // 2. Fetch JioSaavn playlist details
    let isCancelled = false;
    setLoading(true);
    setLoadError(false);

    loadSaavnPlaylist(id)
      .then((res) => {
        if (isCancelled) return;
        if (!res) {
          setLoadError(true);
        }
      })
      .catch((e) => {
        console.warn("Failed to fetch playlist by route id:", e);
        if (!isCancelled) setLoadError(true);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [id, activePlaylist?.id, playlists, loadSaavnPlaylist, setActivePlaylist]);

  const handleBack = () => {
    if (setActiveView) {
      setActiveView("playlists");
    } else {
      navigate("/playlists");
    }
  };

  // If loading or if activePlaylist in store does not match the URL param id
  if (loading || (id && activePlaylist?.id !== id && !loadError)) {
    return (
      <div className="p-12 text-center my-16 space-y-4 animate-fade-in">
        <Loader2 className="w-10 h-10 text-sky-400 mx-auto animate-spin" />
        <h3 className="text-base font-bold text-white">Loading Playlist...</h3>
        <p className="text-xs text-slate-400">Fetching tracks and album artwork</p>
      </div>
    );
  }

  if (loadError || !activePlaylist || (id && activePlaylist.id !== id)) {
    return (
      <div className="p-8 text-center my-16 space-y-4 animate-fade-in">
        <Disc className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-xl font-bold text-white">Playlist Not Found</h3>
        <p className="text-xs text-slate-400">The requested playlist could not be loaded or is unavailable.</p>
        <button
          onClick={handleBack}
          className="px-5 py-2.5 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs rounded-full shadow-lg shadow-sky-500/25 transition-all"
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
      handleBack();
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32 animate-fade-in">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Playlists
      </button>

      {/* Playlist Hero Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-b from-slate-800 via-slate-900 to-[#0b1329] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Ambient glow decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <img
          src={
            activePlaylist.cover_url ||
            "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80"
          }
          alt={activePlaylist.name}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl object-cover shadow-2xl shrink-0 border border-white/10 relative z-10"
        />
        <div className="space-y-2 text-center sm:text-left flex-1 relative z-10">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400">
            {(activePlaylist as any).is_saavn ? "JioSaavn Curated" : "Playlist"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {activePlaylist.name}
          </h1>
          <p className="text-xs text-slate-300">{activePlaylist.description || "No description provided."}</p>
          <div className="text-xs text-slate-400 font-medium pt-1">{activePlaylist.songs.length} songs</div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-4">
            <button
              onClick={handlePlayAll}
              disabled={activePlaylist.songs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-full shadow-lg shadow-sky-500/30 transition-all"
            >
              <Play className="w-4 h-4 fill-current" /> Play All
            </button>
            {!(activePlaylist as any).is_saavn && (
              <button
                onClick={handleDelete}
                className="p-3 text-slate-300 hover:text-rose-400 bg-slate-800 border border-white/10 rounded-full transition-colors"
                title="Delete Playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Song List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">Songs in Playlist</h3>
        {activePlaylist.songs.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-700/60 rounded-3xl text-slate-400 text-xs bg-slate-900/40 backdrop-blur-xl">
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
