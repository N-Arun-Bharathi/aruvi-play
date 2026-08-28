import React, { useState, useEffect } from "react";
import { Song, getTrendingSongs } from "@aruvi/shared";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { useRoomStore } from "../store/roomStore";
import { Play, Users, Volume2 } from "lucide-react";

interface HomeViewProps {
  setActiveView: (view: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveView }) => {
  const { userProfile } = useAuthStore();
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const { fetchActiveRooms } = useRoomStore();

  const [recommended, setRecommended] = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = userProfile?.name || "Arun";

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const trending = await getTrendingSongs();

        // 3 Featured Recommended Songs
        const featuredRecs = trending.slice(0, 3);
        setRecommended(featuredRecs);

        // Recently Played Songs
        const recent = trending.slice(3, 7);
        setRecentlyPlayed(recent);

        fetchActiveRooms();
      } catch (err) {
        console.error("Home loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-6 sm:p-8 space-y-10 max-w-7xl mx-auto pb-36">
      {/* Greeting Header */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Good evening, {userName}
        </h1>
        <p className="text-xs text-zinc-400 font-medium">Here's your personal soundtrack for tonight.</p>
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
                    className="group bg-zinc-900/60 border border-zinc-850 hover:border-cyan-500/40 rounded-3xl p-4 cursor-pointer transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden"
                  >
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3.5 bg-zinc-800">
                      <img
                        src={song.artwork || "/aruvi-play.png"}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="w-12 h-12 rounded-full bg-cyan-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-cyan-400/40">
                          <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                      {song.title}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">
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
                    className="flex items-center gap-3.5 p-3 bg-zinc-900/50 hover:bg-zinc-850/80 border border-zinc-850 rounded-2xl cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0 relative">
                      <img
                        src={song.artwork || "/aruvi-play.png"}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && isPlaying && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate font-medium">
                        {song.artist}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Active Rooms Widget */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-400" /> Active Rooms
            </h2>
            <button
              onClick={() => setActiveView("rooms")}
              className="text-[11px] font-bold text-cyan-400 hover:underline"
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
                className="p-4 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 rounded-2xl cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate max-w-[130px]">
                    {room.name}
                  </h4>
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded-full border border-yellow-500/20">
                    ● {room.members}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex -space-x-2">
                    {room.avatars.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="member"
                        className="w-5 h-5 rounded-full border border-zinc-900 object-cover"
                      />
                    ))}
                  </div>
                  <span className="truncate max-w-[120px] text-right font-medium">
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
