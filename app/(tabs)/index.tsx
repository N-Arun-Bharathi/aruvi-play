import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Song } from "../../types/song";
import { getTrending, searchSongs } from "../../services/saavn";
import { SongCard } from "../../components/SongCard";
import { SongRow } from "../../components/SongRow";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { Icon } from "../../components/Icon";
import { useSettingsStore } from "../../store/settingsStore";
import { useScrollHandler } from "../../hooks/useScrollHandler";

const { width } = Dimensions.get("window");

const GENRES = ["Kuthu", "Melody", "Gaana", "Love Hits", "90s Tamil", "Spiritual"];
const ARTISTS = [
  { name: "A.R. Rahman", img: "https://c.saavncdn.com/artists/A.R._Rahman_002_20210514115148_150x150.jpg" },
  { name: "Anirudh Ravichander", img: "https://c.saavncdn.com/artists/Anirudh_Ravichander_150x150.jpg" },
  { name: "Yuvan Shankar Raja", img: "https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_150x150.jpg" },
  { name: "Harris Jayaraj", img: "https://c.saavncdn.com/artists/Harris_Jayaraj_150x150.jpg" },
];

export default function Home() {
  const router = useRouter();
  const recent = useLibraryStore((s) => s.recent);
  const refreshRecent = useLibraryStore((s) => s.refreshRecent);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const languages = useSettingsStore((s) => s.languages);
  const setLanguages = useSettingsStore((s) => s.setLanguages);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  
  const [trending, setTrending] = useState<Song[]>([]);
  const [recommended, setRecommended] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const onScroll = useScrollHandler();

  useEffect(() => {
    hydrateSettings();
  }, []);

  useEffect(() => {
    refreshRecent();
    let mounted = true;
    setLoading(true);

    // Fetch trending and recommended
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
  }, [refreshRecent, languages]);

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      if (languages.length > 1) {
        setLanguages(languages.filter((l) => l !== lang));
      }
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleQuickGenreSearch = (genreName: string) => {
    router.push({
      pathname: "/(tabs)/search",
      params: { prefill: genreName },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="bg-accent/10 p-2 rounded-xl border border-accent/20">
                <Image 
                  source={require("../../assets/logo.png")} 
                  style={{ width: 32, height: 32 }}
                />
              </View>
              <Text className="text-text text-2xl font-bold ml-3">Aruvi Play</Text>
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/search")}
              className="p-2.5 bg-white/5 rounded-full border border-white/5 active:bg-white/10"
            >
              <Icon name="search" size={20} />
            </Pressable>
          </View>
          
          {/* Language Selection Chips */}
          <View className="flex-row mt-4">
            {["tamil", "english", "hindi"].map((l) => (
              <Pressable
                key={l}
                onPress={() => toggleLanguage(l)}
                className={`px-4 py-1.5 rounded-full mr-2.5 border transition-all ${
                  languages.includes(l) 
                    ? "bg-accent border-accent" 
                    : "bg-surface border-white/10"
                }`}
              >
                <Text className={`text-xs font-bold capitalize ${
                  languages.includes(l) ? "text-black" : "text-text"
                }`}>
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color="#1DB954" />
          </View>
        ) : (
          <View>
            {/* Recently Played */}
            {recent.length > 0 && (
              <View className="mt-6">
                <Text className="text-text text-xl font-bold px-5 mb-3">
                  Recently Played
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                >
                  {recent.map((s) => (
                    <SongCard
                      key={s.id}
                      song={s}
                      onPress={() => {
                        playSong(s, recent);
                        router.push("/player");
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Trending Sections */}
            <View className="mt-6">
              <Text className="text-text text-xl font-bold px-5 mb-3">
                Trending Hits
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {trending.slice(0, 8).map((s) => (
                  <SongCard
                    key={s.id}
                    song={s}
                    onPress={() => {
                      playSong(s, trending);
                      router.push("/player");
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Premium Category/Genre Chips */}
            <View className="mt-6">
              <Text className="text-text text-xl font-bold px-5 mb-3">
                Browse Genres
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {GENRES.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => handleQuickGenreSearch(g)}
                    className="px-5 py-3 bg-surface rounded-2xl border border-white/5 mr-3 active:bg-white/10"
                  >
                    <Text className="text-text font-bold text-sm">{g}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Recommended Songs */}
            <View className="mt-6">
              <Text className="text-text text-xl font-bold px-5 mb-3">
                Recommended for You
              </Text>
              <View>
                {recommended.slice(0, 5).map((s) => (
                  <SongRow
                    key={s.id}
                    song={s}
                    liked={isLiked(s)}
                    onLike={() => toggleLike(s)}
                    onAddToQueue={() => addToQueue(s)}
                    onPress={() => {
                      playSong(s, recommended);
                      router.push("/player");
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Featured Artists */}
            <View className="mt-6">
              <Text className="text-text text-xl font-bold px-5 mb-4">
                Popular Artists
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {ARTISTS.map((artist) => (
                  <Pressable
                    key={artist.name}
                    onPress={() => handleQuickGenreSearch(artist.name)}
                    className="items-center mr-5"
                  >
                    <Image
                      source={{ uri: artist.img }}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                      className="border border-white/10"
                    />
                    <Text className="text-text text-xs font-semibold mt-2 text-center w-20" numberOfLines={1}>
                      {artist.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
