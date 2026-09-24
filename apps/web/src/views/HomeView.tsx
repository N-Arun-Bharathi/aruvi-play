import React, { useState, useEffect } from "react";
import {
  Song,
  SaavnPlaylist,
  getTrendingSongs,
  getFeaturedPlaylists,
  searchSongs,
  isAlternateVersion,
} from "@aruvi/shared";
import { useAuthStore } from "../store/authStore";
import { usePlayerStore } from "../store/playerStore";
import { usePlaylistStore } from "../store/playlistStore";
import { useSettingsStore } from "../store/settingsStore";
import { useRoomStore } from "../store/roomStore";
import { useInsightsStore } from "../store/insightsStore";
import { useToastStore } from "../store/toastStore";
import { InsightsModal } from "../components/InsightsModal";
import { DailyMixModal, DailyMixData } from "../components/DailyMixModal";
import {
  Play,
  Users,
  Volume2,
  ListMusic,
  Sparkles,
  Flame,
  Radio,
  BarChart3,
  Loader2,
  List,
} from "lucide-react";

interface HomeViewProps {
  setActiveView: (view: string) => void;
}

const DAILY_MIXES: DailyMixData[] = [
  {
    id: "dm_1",
    title: "Daily Mix 1",
    subtitle: "Acoustic & Chill Vibes",
    searchQueries: ["Sid Sriram", "Pradeep Kumar", "Sean Roldan"],
    gradient: "from-sky-600 via-blue-700 to-indigo-900",
    artists: "Sid Sriram, Pradeep Kumar, Sean Roldan",
    icon: "☕",
  },
  {
    id: "dm_2",
    title: "Daily Mix 2",
    subtitle: "Energetic Beats & Dance",
    searchQueries: ["Anirudh", "Harris Jayaraj", "DSP hits"],
    gradient: "from-blue-600 via-sky-500 to-teal-700",
    artists: "Anirudh, Harris Jayaraj, DSP, Thaman",
    icon: "⚡",
  },
  {
    id: "dm_3",
    title: "Daily Mix 3",
    subtitle: "Golden Melody Classics",
    searchQueries: ["AR Rahman hits", "Yuvan Shankar Raja", "Vidyasagar"],
    gradient: "from-indigo-700 via-blue-800 to-slate-900",
    artists: "A.R. Rahman, Yuvan Shankar Raja, Harris",
    icon: "🎼",
  },
  {
    id: "dm_4",
    title: "Daily Mix 4",
    subtitle: "Late Night Ambient",
    searchQueries: ["Ilaiyaraaja hits", "Santhosh Narayanan", "D. Imman"],
    gradient: "from-slate-900 via-sky-950 to-blue-900",
    artists: "Ilaiyaraaja, Vidyasagar, Santhosh Narayanan",
    icon: "🌙",
  },
  {
    id: "dm_5",
    title: "Daily Mix 5",
    subtitle: "Viral Chartbusters",
    searchQueries: ["GV Prakash hits", "Hiphop Tamizha", "Anirudh hits"],
    gradient: "from-cyan-600 via-blue-600 to-indigo-800",
    artists: "Anirudh, GV Prakash, Hiphop Tamizha",
    icon: "🔥",
  },
];

export const HomeView: React.FC<HomeViewProps> = ({ setActiveView }) => {
  const { userProfile } = useAuthStore();
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const { loadSaavnPlaylist } = usePlaylistStore();
  const { preferredLanguage } = useSettingsStore();
  const { fetchActiveRooms } = useRoomStore();
  const { stats, loadStats } = useInsightsStore();
  const { show: showToast } = useToastStore();

  const [recommended, setRecommended] = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<SaavnPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMixId, setLoadingMixId] = useState<string | null>(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [selectedMixForModal, setSelectedMixForModal] = useState<DailyMixData | null>(null);

  const userName = userProfile?.name || "Arun";

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) {
      return {
        greeting: "Good morning",
        subtext: "Here's your personal soundtrack to kickstart your day.",
      };
    }
    if (hrs < 17) {
      return {
        greeting: "Good afternoon",
        subtext: "Here's your personal soundtrack for this afternoon.",
      };
    }
    if (hrs < 22) {
      return {
        greeting: "Good evening",
        subtext: "Here's your personal soundtrack for tonight.",
      };
    }
    return {
      greeting: "Good night",
      subtext: "Unwind and relax with your late-night soundtrack.",
    };
  };

  const { greeting, subtext } = getGreeting();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const lang = (preferredLanguage || "tamil").toLowerCase();
        const [trending, playlists] = await Promise.all([
          getTrendingSongs([lang]),
          getFeaturedPlaylists([lang]),
        ]);

        const featuredRecs = (trending || []).slice(0, 3);
        setRecommended(featuredRecs);

        const recent = (trending || []).slice(3, 7);
        setRecentlyPlayed(recent);

        setFeaturedPlaylists(playlists || []);
        fetchActiveRooms();
        loadStats();
      } catch (err) {
        console.error("Home loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [preferredLanguage]);

  const handleOpenPlaylist = (plId: string) => {
    setActiveView(`/playlists/${plId}`);
  };

  const handlePlayDailyMix = async (mix: DailyMixData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLoadingMixId(mix.id);
    try {
      const lang = (preferredLanguage || "tamil").toLowerCase();
      const searchPromises = mix.searchQueries.map((q) => searchSongs(`${q} ${lang}`));
      const results = await Promise.allSettled(searchPromises);

      const combined: Song[] = [];
      for (const res of results) {
        if (res.status === "fulfilled" && res.value && res.value.length > 0) {
          combined.push(...res.value.slice(0, 8));
        }
      }

      const distinct: Song[] = [];
      for (const s of combined) {
        if (!distinct.some((d) => d.id === s.id || isAlternateVersion(d, s))) {
          distinct.push(s);
        }
      }

      if (distinct.length === 0) {
        const trending = await getTrendingSongs([lang]);
        if (trending && trending.length > 0) {
          distinct.push(...trending);
        }
      }

      if (distinct.length > 0) {
        playSong(distinct[0], distinct);
        showToast(`Playing ${mix.title}: ${mix.subtitle} 🎶`, "success");
      } else {
        showToast(`Unable to load ${mix.title} tracks.`, "error");
      }
    } catch (e) {
      console.error("Failed to load daily mix:", e);
      showToast(`Error starting ${mix.title}`, "error");
    } finally {
      setLoadingMixId(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-10 max-w-7xl mx-auto pb-36 animate-fade-in">
      {/* Greeting Header & Wrapped Shortcut */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-xs text-slate-400 font-medium">{subtext}</p>
        </div>

        {/* Listening Persona Quick Card */}
        <button
          onClick={() => setIsInsightsOpen(true)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500/15 to-blue-600/15 border border-sky-400/30 hover:border-sky-400 text-left transition-all group backdrop-blur-xl shrink-0"
        >
          <span className="text-2xl">{stats.musicPersona.icon}</span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-sky-400">
              Your Music Persona
            </div>
            <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
              {stats.musicPersona.title}
            </div>
          </div>
          <BarChart3 className="w-4 h-4 text-sky-400 ml-2" />
        </button>
      </div>

      {/* Main Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-10">
          {/* Made For You: Daily Mixes */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" /> Made For You • Daily Mixes
              </h2>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Click any mix to view all tracks
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {DAILY_MIXES.map((mix) => {
                const isLoadingThis = loadingMixId === mix.id;
                return (
                  <div
                    key={mix.id}
                    onClick={() => setSelectedMixForModal(mix)}
                    className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-400/50 rounded-3xl p-3.5 cursor-pointer transition-all hover:scale-[1.03] shadow-xl hover:shadow-sky-500/15 flex flex-col justify-between"
                  >
                    {/* Gradient Art Card */}
                    <div
                      className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${mix.gradient} p-3 flex flex-col justify-between text-white relative overflow-hidden shadow-md mb-2.5`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xl">{mix.icon}</span>
                        <span className="text-[9px] font-black tracking-widest text-sky-200 uppercase bg-black/30 px-2 py-0.5 rounded-full">
                          Aruvi Mix
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-white">{mix.title}</h4>
                        <p className="text-[9px] text-sky-100/90 line-clamp-1">{mix.subtitle}</p>
                      </div>

                      {/* Direct Play Button */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => handlePlayDailyMix(mix, e)}
                          className="w-10 h-10 rounded-full bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center justify-center shadow-lg shadow-sky-500/40 hover:scale-110 transition-transform"
                          title="Play Mix Now"
                        >
                          {isLoadingThis ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          ) : (
                            <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                          {mix.title}
                        </span>
                        <span className="text-[9px] text-sky-400 font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <List className="w-3 h-3" /> View
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{mix.artists}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recommended For You */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide">
              Recommended For You
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {recommended.map((song) => {
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
                  <ListMusic className="w-4 h-4 text-sky-400" /> Featured Playlists
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
                    className="group bg-slate-800/40 hover:bg-slate-800/70 border border-white/[0.05] hover:border-sky-400/30 rounded-2xl p-3 cursor-pointer transition-all hover:scale-[1.02] shadow-lg backdrop-blur-md"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden mb-2.5 bg-slate-900 relative">
                      <img
                        src={pl.image || "/aruvi-play.png"}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                      {pl.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate font-medium">
                      {pl.songCount ? `${pl.songCount} Songs` : "Playlist"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar: Listening Insights & Group Rooms */}
        <div className="space-y-6">
          {/* Listening Insights Card */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 space-y-4 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Listening Insights
                </h3>
              </div>
              <button
                onClick={() => setIsInsightsOpen(true)}
                className="text-[10px] font-bold text-sky-400 hover:underline"
              >
                View Details
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
                <span className="text-slate-400 font-medium">Listening Streak</span>
                <span className="font-black text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> {stats.streakDays || 1} Days
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
                <span className="text-slate-400 font-medium">Total Songs Played</span>
                <span className="font-bold text-white">{stats.totalPlays || 0}</span>
              </div>
            </div>
          </div>

          {/* Live Group Listening Rooms */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 space-y-4 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Social Rooms
                </h3>
              </div>
              <button
                onClick={() => setActiveView("rooms")}
                className="text-[10px] font-bold text-sky-400 hover:underline"
              >
                Explore
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Listen to music in sync with friends in real-time.
            </p>
            <button
              onClick={() => setActiveView("rooms")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 transition-all text-center"
            >
              Join or Create Room
            </button>
          </div>
        </div>
      </div>

      <InsightsModal isOpen={isInsightsOpen} onClose={() => setIsInsightsOpen(false)} />
      <DailyMixModal
        isOpen={!!selectedMixForModal}
        onClose={() => setSelectedMixForModal(null)}
        mix={selectedMixForModal}
      />
    </div>
  );
};
