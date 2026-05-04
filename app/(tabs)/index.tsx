import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Song } from "../../types/song";
import { getTrending } from "../../services/saavn";
import { SongCard } from "../../components/SongCard";
import { SongRow } from "../../components/SongRow";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { Icon } from "../../components/Icon";
import { useSettingsStore } from "../../store/settingsStore";

export default function Home() {
  const router = useRouter();
  const recent = useLibraryStore((s) => s.recent);
  const refreshRecent = useLibraryStore((s) => s.refreshRecent);
  const playSong = usePlayerStore((s) => s.playSong);
  const { languages, setLanguages, hydrate: hydrateSettings } = useSettingsStore();
  const [trending, setTrending] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrateSettings();
  }, []);

  useEffect(() => {
    refreshRecent();
    let mounted = true;
    setLoading(true);
    getTrending(languages.join(","))
      .then((s) => mounted && setTrending(s))
      .finally(() => mounted && setLoading(false));
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

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Image 
                source={require("../../assets/logo.png")} 
                style={{ width: 40, height: 40, borderRadius: 8 }}
              />
              <Text className="text-text text-2xl font-bold ml-3">Aruvi Play</Text>
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/search")}
              className="p-2"
            >
              <Icon name="search" size={22} />
            </Pressable>
          </View>
          
          <View className="flex-row mt-3">
            {["tamil", "english", "hindi"].map((l) => (
              <Pressable
                key={l}
                onPress={() => toggleLanguage(l)}
                className={`px-4 py-1.5 rounded-full mr-2 border ${
                  languages.includes(l) 
                    ? "bg-accent border-accent" 
                    : "bg-transparent border-white/20"
                }`}
              >
                <Text className={`text-xs font-semibold capitalize ${
                  languages.includes(l) ? "text-black" : "text-white"
                }`}>
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {recent.length > 0 ? (
          <View className="mt-4">
            <Text className="text-text text-xl font-semibold px-5 mb-3">
              Recently played
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
        ) : null}

        <View className="mt-6">
          <Text className="text-text text-xl font-semibold px-5 mb-3">
            Suggested for you
          </Text>
          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#1DB954" />
            </View>
          ) : (
            <View>
              {trending.map((s) => (
                <SongRow
                  key={s.id}
                  song={s}
                  onPress={() => {
                    playSong(s, trending);
                    router.push("/player");
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
