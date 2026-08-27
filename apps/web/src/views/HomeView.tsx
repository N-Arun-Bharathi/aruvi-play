import React, { useEffect, useState } from "react";
import { Song, getTrendingSongs, searchSongs } from "@aruvi/shared";
import { SongCard } from "../components/SongCard";
import { SkeletonGrid } from "../components/SkeletonLoader";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { Sparkles, TrendingUp, Flame, Music, Heart, Disc, Radio } from "lucide-react";

interface HomeViewProps {
  setActiveView: (view: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveView }) => {
  const { authMode, userProfile, openAuthModal } = useAuthStore();
  const { playSong } = usePlayerStore();

  const [trending, setTrending] = useState<Song[]>([]);
  const [melodies, setMelodies] = useState<Song[]>([]);
  const [kuthuHits, setKuthuHits] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic greeting based on user's current local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    let isMounted = true;
    const fetchHomeContent = async () => {
      setLoading(true);
      try {
        const [trendData, melData, kuthuData] = await Promise.all([
          getTrendingSongs(["tamil"]),
          searchSongs("anirudh melodies"),
          searchSongs("tamil kuthu hits"),
        ]);
        if (isMounted) {
          setTrending(trendData.slice(0, 12));
          setMelodies(melData.slice(0, 12));
          setKuthuHits(kuthuData.slice(0, 12));
        }
      } catch (err) {
        console.error("Home content fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHomeContent();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-10 max-w-7xl mx-auto pb-32">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border border-emerald-500/20 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> {getGreeting()}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {userProfile?.name ? userProfile.name : "Welcome to Aruvi Play"}
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Stream high-fidelity 320kbps music, listen together in real-time rooms, and explore personalized mixes.
          </p>

          {authMode === "guest" && (
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => openAuthModal("register")}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-full shadow-lg transition-all"
              >
                Sign Up Free
              </button>
              <button
                onClick={() => openAuthModal("login")}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-full border border-zinc-700 transition-colors"
              >
                Log In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveView("liked")}
          className="group p-4 bg-gradient-to-br from-rose-950/40 to-zinc-900 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors">Liked Songs</h3>
            <p className="text-xs text-zinc-400">Your Favourites</p>
          </div>
        </div>

        <div
          onClick={() => setActiveView("rooms")}
          className="group p-4 bg-gradient-to-br from-emerald-950/40 to-zinc-900 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Music Rooms</h3>
            <p className="text-xs text-zinc-400">Listen Together</p>
          </div>
        </div>

        <div
          onClick={() => setActiveView("playlists")}
          className="group p-4 bg-gradient-to-br from-purple-950/40 to-zinc-900 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Playlists</h3>
            <p className="text-xs text-zinc-400">Curated Mixes</p>
          </div>
        </div>

        <div
          onClick={() => setActiveView("history")}
          className="group p-4 bg-gradient-to-br from-amber-950/40 to-zinc-900 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">History</h3>
            <p className="text-xs text-zinc-400">Recently Played</p>
          </div>
        </div>
      </div>

      {/* Trending Now */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Trending Hits</h2>
          </div>
          <button
            onClick={() => setActiveView("search")}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            See all
          </button>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trending.map((song) => (
              <SongCard key={song.id} song={song} queue={trending} />
            ))}
          </div>
        )}
      </section>

      {/* Anirudh Melodies */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Melodic Vibes</h2>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {melodies.map((song) => (
              <SongCard key={song.id} song={song} queue={melodies} />
            ))}
          </div>
        )}
      </section>

      {/* Kuthu Beats */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Party Kuthu Hits</h2>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {kuthuHits.map((song) => (
              <SongCard key={song.id} song={song} queue={kuthuHits} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
