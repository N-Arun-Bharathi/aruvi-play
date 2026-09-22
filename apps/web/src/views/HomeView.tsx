import React, { useState, useEffect } from "react";
import { Song, SaavnPlaylist, getTrendingSongs, getFeaturedPlaylists } from "@aruvi/shared";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { usePlaylistStore } from "../store/playlistStore";
import { useSettingsStore } from "../store/settingsStore";
import { useRoomStore } from "../store/roomStore";
import { Play, Users, Volume2, ListMusic } from "lucide-react";

interface HomeViewProps {
  setActiveView: (view: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveView }) => {
  const { userProfile } = useAuthStore();
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const { loadSaavnPlaylist } = usePlaylistStore();
  const { preferredLanguage } = useSettingsStore();
  const { fetchActiveRooms } = useRoomStore();

  const [recommended, setRecommended] = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<SaavnPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = userProfile?.name || "Arun";

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const lang = (preferredLanguage || "tamil").toLowerCase();
        const [trending, playlists] = await Promise.all([
          getTrendingSongs([lang]),
          getFeaturedPlaylists([lang]),
        ]);

        // 3 Featured Recommended Songs
        const featuredRecs = (trending || []).slice(0, 3);
        setRecommended(featuredRecs);

        // Recently Played Songs
        const recent = (trending || []).slice(3, 7);
        setRecentlyPlayed(recent);

        setFeaturedPlaylists(playlists || []);
        fetchActiveRooms();
      } catch (err) {
        console.error("Home loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleOpenPlaylist = (plId: string) => {
    setActiveView(`/playlists/${plId}`);
  };

  return (
    <div className="p-6 sm:p-8 space-y-10 max-w-7xl mx-auto pb-36 animate-fade-in">
      {/* Greeting Header */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Good evening, {userName}
        </h1>
        <p className="text-xs text-slate-400 font-medium">Here's your personal soundtrack for tonight.</p>
      </div>

      {/* Main Grid + Active Rooms Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Feed (3 Columns) */}
        <div className="lg:col-span-3 space-y-10">
          {/* Recommended For You */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide">
              Recommended For You
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {recommended.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => playSong(song, recommended)}
                    className="group bg-slate-800/60 hover:bg-slate-800/90 border border-white/[0.08] hover:border-sky-400/40 rounded-3xl p-4 cursor-pointer transition-all hover:scale-[1.02] shadow-xl hover:shadow-sky-500/15 backdrop-blur-xl relative overflow-hidden"
                  >
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3.5 bg-slate-900">
                      <img
                        src={song.artwork || "/aruvi-play.png"}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/40">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                      {song.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">
                      {song.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recently Played */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide">
              Recently Played
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentlyPlayed.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => playSong(song, recentlyPlayed)}
                    className="flex items-center gap-3.5 p-3 bg-slate-800/50 hover:bg-slate-800/80 border border-white/[0.06] hover:border-sky-400/30 rounded-2xl cursor-pointer transition-all group backdrop-blur-lg"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 relative">
                      <img
                        src={song.artwork || "/aruvi-play.png"}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && isPlaying && (
                        <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-sky-400 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate font-medium">
                        {song.artist}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Featured JioSaavn Playlists */}
          {featuredPlaylists.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-sky-400" /> Featured JioSaavn Playlists
                </h2>
                <button
                  onClick={() => setActiveView("playlists")}
                  className="text-[11px] font-bold text-sky-400 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {featuredPlaylists.slice(0, 8).map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => handleOpenPlaylist(pl.id)}
                    className="group bg-slate-800/50 hover:bg-slate-800/80 border border-white/[0.06] hover:border-sky-400/30 rounded-2xl p-3 cursor-pointer transition-all hover:scale-[1.02] relative overflow-hidden shadow-lg backdrop-blur-lg"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 bg-slate-900">
                      <img
                        src={pl.image || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4"}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {pl.songCount && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 border border-white/10 text-[10px] font-bold text-white">
                          {pl.songCount} Tracks
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                      {pl.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                      {pl.subtitle || "JioSaavn Playlist"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Active Rooms Widget */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> Active Rooms
            </h2>
            <button
              onClick={() => setActiveView("rooms")}
              className="text-[11px] font-bold text-sky-400 hover:underline"
            >
              View All
            </button>
          </div>

          {/* Rooms List */}
          <div className="space-y-3">
            {[
              {
                id: "room-1",
                name: "Late Night Lo-Fi",
                members: 42,
                song: "Chillhop Beats",
                avatars: [
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
                ],
              },
              {
                id: "room-2",
                name: "Synth & Drive",
                members: 18,
                song: "Neon Nights",
                avatars: [
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
                ],
              },
            ].map((room) => (
              <div
                key={room.id}
                onClick={() => setActiveView("rooms")}
                className="p-4 bg-slate-800/60 hover:bg-slate-800/90 border border-white/[0.08] hover:border-sky-400/40 rounded-2xl cursor-pointer transition-all space-y-3 shadow-md backdrop-blur-lg"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate max-w-[130px]">
                    {room.name}
                  </h4>
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-500/30">
                    ● {room.members}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex -space-x-2">
                    {room.avatars.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="member"
                        className="w-5 h-5 rounded-full border border-slate-900 object-cover"
                      />
                    ))}
                  </div>
                  <span className="truncate max-w-[120px] text-right font-medium text-slate-300">
                    Now: {room.song}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
