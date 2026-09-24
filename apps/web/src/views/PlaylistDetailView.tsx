import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlaylistStore } from "../store/playlistStore";
import { usePlayerStore } from "../store/playerStore";
import { useToastStore } from "../store/toastStore";
import { SongListRow } from "../components/SongListRow";
import { Song, getRelatedSongs, searchSongs, extractPrimaryArtist, isAlternateVersion } from "@aruvi/shared";
import { Play, Trash2, ArrowLeft, Disc, Loader2, Sparkles, Plus, Check } from "lucide-react";

interface PlaylistDetailViewProps {
  setActiveView?: (view: string) => void;
}

interface DisplayTrack {
  song: Song;
  isEnhanced?: boolean;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ setActiveView }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { playlists, activePlaylist, setActivePlaylist, loadSaavnPlaylist, deletePlaylist, addSongToPlaylist } =
    usePlaylistStore();
  const { playSong } = usePlayerStore();
  const { show: showToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  const [enhancedTracks, setEnhancedTracks] = useState<DisplayTrack[]>([]);
  const [addedSongIds, setAddedSongIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;

    if (activePlaylist && activePlaylist.id === id) {
      setLoading(false);
      setLoadError(false);
      return;
    }

    const foundLocal = playlists.find((p) => p.id === id);
    if (foundLocal) {
      setActivePlaylist(foundLocal);
      setLoading(false);
      setLoadError(false);
      return;
    }

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

  const handleToggleEnhance = async () => {
    if (isEnhancedMode) {
      setIsEnhancedMode(false);
      showToast("Smart Enhance turned off", "info");
      return;
    }

    if (!activePlaylist || activePlaylist.songs.length === 0) {
      showToast("Add songs to this playlist first to enable Smart Enhance!", "info");
      return;
    }

    setIsEnhancing(true);
    try {
      const originalSongs = activePlaylist.songs;
      const seedSong = originalSongs[0];
      const artist = extractPrimaryArtist(seedSong);

      let recommendations: Song[] = [];
      try {
        recommendations = await getRelatedSongs(seedSong.id);
      } catch (e) {}

      if (recommendations.length < 5 && artist) {
        try {
          const artistHits = await searchSongs(`${artist} hits`);
          recommendations = [...recommendations, ...artistHits];
        } catch (e) {}
      }

      // Filter out existing songs
      const filteredRecs = recommendations.filter(
        (rec) => !originalSongs.some((orig) => orig.id === rec.id || isAlternateVersion(rec, orig))
      );

      // Build interleaved enhanced list: 2 original songs -> 1 recommended song
      const mixed: DisplayTrack[] = [];
      let recIndex = 0;

      for (let i = 0; i < originalSongs.length; i++) {
        mixed.push({ song: originalSongs[i], isEnhanced: false });
        if ((i + 1) % 2 === 0 && recIndex < filteredRecs.length) {
          mixed.push({ song: filteredRecs[recIndex], isEnhanced: true });
          recIndex++;
        }
      }

      setEnhancedTracks(mixed);
      setIsEnhancedMode(true);
      showToast("✨ Smart Enhance activated! Added AI recommendations.", "success");
    } catch (e) {
      console.error("Enhance playlist error:", e);
      showToast("Could not fetch recommendations at this moment.", "error");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAddEnhancedToPlaylist = async (song: Song) => {
    if (!activePlaylist || (activePlaylist as any).is_saavn) {
      showToast("Cannot add to JioSaavn curated playlists directly.", "info");
      return;
    }
    await addSongToPlaylist(activePlaylist.id, song);
    setAddedSongIds((prev) => new Set(prev).add(song.id));
    showToast(`Added "${song.title}" permanently to playlist!`, "success");
  };

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

  const effectiveSongs = isEnhancedMode ? enhancedTracks.map((t) => t.song) : activePlaylist.songs;

  const handlePlayAll = () => {
    if (effectiveSongs.length > 0) {
      playSong(effectiveSongs[0], effectiveSongs);
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
          <div className="text-xs text-slate-400 font-medium pt-1">
            {isEnhancedMode ? `${effectiveSongs.length} songs (Enhanced)` : `${activePlaylist.songs.length} songs`}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-4">
            <button
              onClick={handlePlayAll}
              disabled={effectiveSongs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-full shadow-lg shadow-sky-500/30 transition-all"
            >
              <Play className="w-4 h-4 fill-current" /> Play All
            </button>

            {/* Smart Enhance Playlist Button */}
            <button
              onClick={handleToggleEnhance}
              disabled={isEnhancing || activePlaylist.songs.length === 0}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold border transition-all ${
                isEnhancedMode
                  ? "bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-md shadow-sky-500/15"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-white/10"
              }`}
            >
              {isEnhancing ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-sky-400" />
              )}
              <span>{isEnhancedMode ? "Enhanced Active" : "Enhance Playlist"}</span>
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Songs in Playlist</h3>
          {isEnhancedMode && (
            <span className="text-xs font-extrabold text-sky-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Recommended Tracks Added
            </span>
          )}
        </div>

        {activePlaylist.songs.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-700/60 rounded-3xl text-slate-400 text-xs bg-slate-900/40 backdrop-blur-xl">
            No songs added yet. Click "+" on any song card or row to add it here!
          </div>
        ) : isEnhancedMode ? (
          <div className="space-y-1">
            {enhancedTracks.map((item, idx) => (
              <div key={`${item.song.id}_${idx}`} className="relative group">
                <SongListRow song={item.song} index={idx} queue={effectiveSongs} />
                {item.isEnhanced && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-16 sm:right-28 flex items-center gap-2 pointer-events-auto">
                    <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[9px] font-black uppercase tracking-wider">
                      ✨ Recommended
                    </span>
                    {!(activePlaylist as any).is_saavn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddEnhancedToPlaylist(item.song);
                        }}
                        disabled={addedSongIds.has(item.song.id)}
                        className="p-1.5 rounded-full bg-slate-800 hover:bg-sky-500 text-slate-300 hover:text-slate-950 transition-colors border border-slate-700"
                        title="Add to this playlist permanently"
                      >
                        {addedSongIds.has(item.song.id) ? (
                          <Check className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
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
