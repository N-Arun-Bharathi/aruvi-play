import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useTheme } from "../../utils/theme";
import { useProgress } from "../../hooks/useProgress";
import { Icon } from "../../components/Icon";
import { AppScreen } from "../../components/AppScreen";
import { SectionHeader } from "../../components/SectionHeader";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { SkeletonCard } from "../../components/SkeletonCard";
import { SkeletonRow } from "../../components/SkeletonRow";
import { Song } from "../../types/song";
import { getTrending, searchSongs } from "../../services/saavn";

const GENRES = ["Tamil Kuthu", "Melody", "Gaana", "Love Hits", "90s Tamil", "Spiritual"];
const ARTISTS = [
  { name: "A.R. Rahman", img: "https://c.saavncdn.com/artists/A.R._Rahman_002_20210514115148_150x150.jpg" },
  { name: "Anirudh Ravichander", img: "https://c.saavncdn.com/artists/Anirudh_Ravichander_150x150.jpg" },
  { name: "Yuvan Shankar Raja", img: "https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_150x150.jpg" },
  { name: "Harris Jayaraj", img: "https://c.saavncdn.com/artists/Harris_Jayaraj_150x150.jpg" },
];

const ContinueListeningProgressBar = React.memo(({ songId }: { songId: string }) => {
  const currentId = usePlayerStore((s) => s.current?.id);
  const progress = useProgress();
  const theme = useTheme();

  if (currentId !== songId || progress.duration === 0) return null;

  return (
    <View className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: theme.border }}>
      <View 
        className="h-full rounded-full" 
        style={{ 
          backgroundColor: theme.accent,
          width: `${(progress.position / progress.duration) * 100}%` 
        }}
      />
    </View>
  );
});


export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const recent = useLibraryStore((s) => s.recent);
  const refreshRecent = useLibraryStore((s) => s.refreshRecent);
  
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playSong = usePlayerStore((s) => s.playSong);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const userProfile = useAuthStore((s) => s.userProfile);
  const languages = useSettingsStore((s) => s.languages);
  const toggleLanguage = async (lang: string) => {
    const setLanguages = useSettingsStore.getState().setLanguages;
    if (languages.includes(lang)) {
      if (languages.length > 1) {
        await setLanguages(languages.filter((l) => l !== lang));
      }
    } else {
      await setLanguages([...languages, lang]);
    }
  };



  const [trending, setTrending] = useState<Song[]>([]);
  const [recommended, setRecommended] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  // Time-based greeting
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    if (hrs < 22) return "Good evening";
    return "Good night";
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    refreshRecent();

    Promise.all([
      getTrending(languages.join(",")),
      searchSongs("tamil super hit melodies", 10),
    ])
      .then(([trendSongs, recSongs]) => {
        if (mounted) {
          setTrending(trendSongs);
          setRecommended(recSongs);
        }
      })
      .catch((err) => console.error("Error loading home feeds", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [languages]);

  const lastPlayed = current || recent[0];

  const handleQuickGenreSearch = (genreName: string) => {
    router.push({
      pathname: "/(tabs)/search",
      params: { prefill: genreName },
    });
  };

  const handlePlayLastPlayed = async () => {
    if (!lastPlayed) return;
    if (current && lastPlayed.id === current.id) {
      await togglePlay();
    } else {
      await playSong(lastPlayed, recent.length > 0 ? recent : [lastPlayed]);
    }
  };

  const currentSong = usePlayerStore((s) => s.current);
  const isGuest = userProfile?.is_guest ?? false;
  const bottomPadding = currentSong ? 210 : 150;

  return (
    <AppScreen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* Header Section */}
        <View className="flex-row items-center justify-between px-5 pt-5 pb-2">
          <View className="flex-row items-center">
            <View 
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                overflow: "hidden",
                borderWidth: 1.5,
                borderColor: "rgba(16, 185, 129, 0.3)",
                marginRight: 12,
              }}
            >
              <Image
                source={require("../../assets/aruvi-play.png")}
                style={{ width: 44, height: 44, borderRadius: 22 }}
                contentFit="cover"
              />
            </View>
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.secondaryText }}>
                {getGreeting()},
              </Text>
              <Text className="text-2xl font-bold tracking-tight mt-0.5" style={{ color: theme.primaryText }}>
                {userProfile?.name || "Aruvi User"}
              </Text>
            </View>
          </View>
          <Pressable 
            onPress={() => router.push("/(tabs)/profile")} 
            className="active:scale-95 transition-transform"
          >
            <ProfileAvatar size={44} />
          </Pressable>
        </View>

        {/* Language chips */}
        <View className="flex-row px-5 mt-3 mb-2">
          {["tamil", "english", "hindi"].map((lang) => {
            const isSelected = languages.includes(lang);
            return (
              <Pressable
                key={lang}
                onPress={() => toggleLanguage(lang)}
                className="px-4 py-1.5 rounded-full mr-2.5 border"
                style={{
                  backgroundColor: isSelected ? theme.accent : theme.elevatedSurface,
                  borderColor: isSelected ? theme.accent : theme.border,
                }}
              >
                <Text
                  className="text-xs font-bold capitalize"
                  style={{ color: isSelected ? "#000000" : theme.primaryText }}
                >
                  {lang}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Loading shimmer loaders or content */}
        {loading ? (
          <View className="mt-4">
            <View className="px-5 mb-6">
              <View className="h-40 rounded-3xl" style={{ backgroundColor: theme.card }} />
            </View>
            <SectionHeader title="Recently Played" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5 mb-6">
              {[1, 2, 3].map((x) => <SkeletonCard key={x} />)}
            </ScrollView>
            <SectionHeader title="Recommended for You" />
            {[1, 2, 3].map((x) => <SkeletonRow key={x} />)}
          </View>
        ) : (
          <View>
            {/* Registered User: Continue Listening Featured Card */}
            {!isGuest && lastPlayed && (
              <View className="px-5 mt-5">
                <Pressable
                  onPress={() => router.push("/player")}
                  className="rounded-3xl p-4 border flex-row items-center relative overflow-hidden shadow-xl"
                  style={{ backgroundColor: theme.card, borderColor: theme.border }}
                >
                  <View 
                    className="absolute -right-20 -bottom-20 w-44 h-44 rounded-full opacity-10" 
                    style={{ backgroundColor: theme.accent }}
                  />
                  
                  <Image
                    source={{ uri: lastPlayed.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17" }}
                    style={{ width: 84, height: 84, borderRadius: 16 }}
                    className="border border-white/5"
                  />
                  
                  <View className="flex-1 ml-4 justify-center pr-10">
                    <Text className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: theme.accent }}>
                      Continue Listening
                    </Text>
                    <Text className="text-base font-bold" numberOfLines={1} style={{ color: theme.primaryText }}>
                      {lastPlayed.title}
                    </Text>
                    <Text className="text-xs font-medium mt-0.5" numberOfLines={1} style={{ color: theme.secondaryText }}>
                      {lastPlayed.artist}
                    </Text>
                    
                    <ContinueListeningProgressBar songId={lastPlayed.id} />
                  </View>

                  <Pressable
                    onPress={handlePlayLastPlayed}
                    className="w-12 h-12 rounded-full items-center justify-center absolute right-4 bottom-4 shadow-md active:scale-95"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Icon 
                      name={current && current.id === lastPlayed.id && isPlaying ? "pause" : "play"} 
                      size={20} 
                      color="#000000" 
                    />
                  </Pressable>
                </Pressable>
              </View>
            )}

            {/* Quick Access Shortcuts Grid */}
            <View className="px-5 mt-6 flex-row flex-wrap justify-between">
              {isGuest ? (
                <>
                  <Pressable
                    onPress={() => router.push("/(tabs)/queue" as any)}
                    className="w-[48%] py-3.5 px-4 rounded-2xl border flex-row items-center mb-3 active:bg-white/5"
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                  >
                    <View className="p-2.5 rounded-xl mr-3 bg-emerald-500/15">
                      <Icon name="queue" size={18} color={theme.accent} />
                    </View>
                    <Text className="text-sm font-bold flex-1" style={{ color: theme.primaryText }} numberOfLines={1}>
                      Current Queue
                    </Text>
                  </Pressable>
                </>
              ) : (
                [
                  { label: "Liked Songs", icon: "heart-filled", color: theme.error, route: "/(tabs)/library", tab: "liked" },
                  { label: "Playlists", icon: "list", color: theme.accent, route: "/(tabs)/library", tab: "playlists" },
                  { label: "Downloads", icon: "folder", color: theme.warning, route: "/(tabs)/library", tab: "local" },
                ].map((item, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => router.push(item.route as any)}
                    className="w-[48%] py-3.5 px-4 rounded-2xl border flex-row items-center mb-3 active:bg-white/5"
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                  >
                    <View 
                      className="p-2.5 rounded-xl mr-3"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <Text className="text-sm font-bold flex-1" style={{ color: theme.primaryText }} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            {/* Registered User: Recently Played Section */}
            {!isGuest && recent.length > 0 && (
              <View className="mt-6">
                <SectionHeader title="Recently Played" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  className="mt-2"
                >
                  {recent.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        playSong(s, recent);
                        router.push("/player");
                      }}
                      className="mr-4 w-28 active:scale-95 transition-transform"
                    >
                      <Image
                        source={{ uri: s.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17" }}
                        style={{ width: 112, height: 112, borderRadius: 20 }}
                        className="border border-white/5"
                      />
                      <Text className="text-xs font-bold mt-2 text-left" numberOfLines={1} style={{ color: theme.primaryText }}>
                        {s.title}
                      </Text>
                      <Text className="text-[10px] mt-0.5 text-left" numberOfLines={1} style={{ color: theme.secondaryText }}>
                        {s.artist}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Trending Hits Section */}
            {trending.length > 0 && (
              <View className="mt-6">
                <SectionHeader title="Trending Hits" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  className="mt-2"
                >
                  {trending.slice(0, 8).map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        playSong(s, trending);
                        router.push("/player");
                      }}
                      className="mr-4 w-28 active:scale-95 transition-transform"
                    >
                      <Image
                        source={{ uri: s.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17" }}
                        style={{ width: 112, height: 112, borderRadius: 20 }}
                        className="border border-white/5"
                      />
                      <Text className="text-xs font-bold mt-2 text-left" numberOfLines={1} style={{ color: theme.primaryText }}>
                        {s.title}
                      </Text>
                      <Text className="text-[10px] mt-0.5 text-left" numberOfLines={1} style={{ color: theme.secondaryText }}>
                        {s.artist}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Browse Genres Section */}
            <View className="mt-6">
              <SectionHeader title="Browse Genres" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                className="mt-2"
              >
                {GENRES.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => handleQuickGenreSearch(g)}
                    className="px-5 py-3 rounded-2xl border mr-3 active:bg-white/10"
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                  >
                    <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Recommended Songs Section */}
            {recommended.length > 0 && (
              <View className="mt-6">
                <SectionHeader title="Recommended for You" />
                <View className="mt-2">
                  {recommended.slice(0, 5).map((s) => {
                    const isLiked = !isGuest && useLibraryStore.getState().isLiked(s);
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          playSong(s, recommended);
                          router.push("/player");
                        }}
                        className="flex-row items-center px-5 py-2.5 active:bg-white/5"
                      >
                        <Image
                          source={{ uri: s.artwork }}
                          style={{ width: 44, height: 44, borderRadius: 10 }}
                          className="border border-white/5"
                        />
                        <View className="flex-1 ml-3.5">
                          <Text className="text-sm font-bold" style={{ color: theme.primaryText }} numberOfLines={1}>
                            {s.title}
                          </Text>
                          <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }} numberOfLines={1}>
                            {s.artist}
                          </Text>
                        </View>
                        {!isGuest && (
                          <Pressable 
                            onPress={async () => {
                              await useLibraryStore.getState().toggleLike(s);
                            }}
                            className="p-2"
                          >
                            <Icon 
                              name={isLiked ? "heart-filled" : "heart"} 
                              size={20} 
                              color={isLiked ? theme.error : theme.secondaryText} 
                            />
                          </Pressable>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Popular Artists Section */}
            <View className="mt-6">
              <SectionHeader title="Popular Artists" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                className="mt-2"
              >
                {ARTISTS.map((artist) => (
                  <Pressable
                    key={artist.name}
                    onPress={() => handleQuickGenreSearch(artist.name)}
                    className="items-center mr-5 active:scale-95 transition-transform"
                  >
                    <Image
                      source={{ uri: artist.img }}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                      className="border border-white/10"
                    />
                    <Text className="text-xs font-semibold mt-2 text-center w-20" numberOfLines={1} style={{ color: theme.primaryText }}>
                      {artist.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}
