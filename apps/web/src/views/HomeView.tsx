import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Song, getTrendingSongs } from "@aruvi/shared";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { useRoomStore } from "../store/roomStore";
import { useHistoryStore } from "../store/historyStore";
import { Play, Users, Volume2, Radio, Plus } from "lucide-react";

interface HomeViewProps {
  setActiveView?: (view: string) => void;
}

const GENRES = ["Tamil Kuthu", "Melody", "Gaana", "Love Hits", "90s Tamil", "Spiritual"];
const ARTISTS = [
  { name: "A.R. Rahman", img: "https://c.saavncdn.com/artists/A.R._Rahman_002_20210514115148_150x150.jpg" },
  { name: "Anirudh Ravichander", img: "https://c.saavncdn.com/artists/Anirudh_Ravichander_150x150.jpg" },
  { name: "Yuvan Shankar Raja", img: "https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_150x150.jpg" },
  { name: "Harris Jayaraj", img: "https://c.saavncdn.com/artists/Harris_Jayaraj_150x150.jpg" },
];
const LANGUAGES = ["Tamil", "Telugu", "Hindi", "Malayalam", "Kannada", "English"];

export const HomeView: React.FC<HomeViewProps> = ({ setActiveView }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const { activeRooms, fetchActiveRooms, joinRoomByCode } = useRoomStore();
  const { history } = useHistoryStore();

  const [recommended, setRecommended] = useState<Song[]>([]);
  const [trendingList, setTrendingList] = useState<Song[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>("Tamil");
  const [loading, setLoading] = useState(true);

  const userName = userProfile?.name || "Music Lover";

  // Dynamic Time-based greeting
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    if (hrs < 22) return "Good evening";
    return "Good night";
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const trending = await getTrendingSongs();
        setRecommended(trending.slice(0, 4));
        setTrendingList(trending.slice(4, 12));
        fetchActiveRooms();
      } catch (err) {
        console.error("Home loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const recentSongs = history.length > 0 
    ? history.slice(0, 6).map((h) => h.song) 
    : trendingList.slice(0, 6);

  return (
    <div className="p-6 sm:p-8 space-y-10 max-w-7xl mx-auto pb-36">
      {/* Greeting Header & Language Chips */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-xs text-zinc-400 font-medium">Here's your personal soundtrack for today.</p>
        </div>

        {/* Language Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLang.toLowerCase() === lang.toLowerCase();
            return (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border ${
                  isSelected
                    ? "bg-cyan-500 text-zinc-950 border-cyan-400 shadow-lg shadow-cyan-500/20"
                    : "bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid + Active Rooms Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Feed (3 Columns) */}
        <div className="lg:col-span-3 space-y-10">
          {/* Top Music Directors / Artists */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide">
              Top Music Directors
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ARTISTS.map((artist) => (
                <div
                  key={artist.name}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(artist.name)}`)}
                  className="flex flex-col items-center p-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 hover:border-cyan-500/30 rounded-3xl cursor-pointer transition-all hover:scale-105 group text-center"
                >
                  <img
                    src={artist.img}
                    alt={artist.name}
                    className="w-20 h-20 rounded-full object-cover shadow-lg border border-zinc-700 group-hover:border-cyan-400 transition-colors mb-2.5"
                  />
                  <span className="text-xs font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors truncate w-full">
                    {artist.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Artist</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recommended For You */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide">
              Trending Hits
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recommended.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => playSong(song, recommended)}
                    className="group bg-zinc-900/60 border border-zinc-850 hover:border-cyan-500/40 rounded-3xl p-3.5 cursor-pointer transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden"
                  >
                    <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-zinc-800">
                      <img
                        src={song.artwork || "/aruvi-play.png"}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="w-10 h-10 rounded-full bg-cyan-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-cyan-400/40">
                          <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                      {song.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
                      {song.artist}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Featured Genres & Moods */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide">
              Featured Moods & Genres
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(genre)}`)}
                  className="px-4 py-2.5 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-cyan-500/30 text-zinc-300 hover:text-white rounded-2xl text-xs font-bold transition-all shadow-sm"
                >
                  {genre}
                </button>
              ))}
            </div>
          </section>

          {/* Recently Played / Popular Tracks */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide">
              {history.length > 0 ? "Recently Played" : "Popular Tracks"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {recentSongs.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => playSong(song, recentSongs)}
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
              <Users className="w-4 h-4 text-yellow-400" /> Social Rooms
            </h2>
            <button
              onClick={() => navigate("/rooms")}
              className="text-[11px] font-bold text-cyan-400 hover:underline"
            >
              View All
            </button>
          </div>

          {/* Rooms List */}
          <div className="space-y-3">
            {activeRooms.length === 0 ? (
              <div
                onClick={() => navigate("/rooms")}
                className="p-5 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:border-cyan-500/30 transition-all text-center space-y-2.5"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Create a Room</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Listen with friends in sync</p>
                </div>
              </div>
            ) : (
              activeRooms.slice(0, 3).map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    const code = room.code || room.room_code || "";
                    joinRoomByCode(code);
                    navigate(`/rooms/${code}`);
                  }}
                  className="p-4 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 rounded-2xl cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white truncate max-w-[140px]">
                      {room.name}
                    </h4>
                    <span className="text-[10px] font-extrabold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      ● LIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Host: {room.host_name || "Host"}</span>
                    <span className="font-mono text-zinc-500">{room.code || room.room_code}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
