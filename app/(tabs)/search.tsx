import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SearchBar } from "../../components/SearchBar";
import { SongRow } from "../../components/SongRow";
import { searchSongs } from "../../services/saavn";
import { Song } from "../../types/song";
import { usePlayerStore } from "../../store/playerStore";
import { useLibraryStore } from "../../store/likedStore";
import { useTheme } from "../../utils/theme";
import { Icon } from "../../components/Icon";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { SkeletonRow } from "../../components/SkeletonRow";
import { EmptyState } from "../../components/EmptyState";

const TRENDING_SEARCHES = ["Kaavala", "Hukum", "Anirudh Hits", "A.R. Rahman", "Harris Melody", "Leo Theme"];
const GENRES = ["Melodies", "Kuthu / Dance", "Romantic Hits", "Gaana Beat", "Devotional", "90s Golden"];

export default function Search() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ prefill?: string }>();
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history on mount
  useEffect(() => {
    AsyncStorage.getItem("aruvi:searchHistory").then((raw) => {
      if (raw) setHistory(JSON.parse(raw));
    });
  }, []);

  // Handle prefill query parameter (from Home page chips)
  useEffect(() => {
    if (params?.prefill) {
      setQ(params.prefill);
    }
  }, [params?.prefill]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    
    // Cancel the previous active search request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      try {
        const r = await searchSongs(q, 20, controller.signal);
        if (!controller.signal.aborted) {
          setResults(r);
        }
      } catch (err: any) {
        const isCancel = err?.name === "CanceledError" || err?.name === "AbortError" || err?.message === "canceled";
        if (!isCancel) {
          console.error("Search fetch failed", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350); // 350ms debounce
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const saveSearchHistory = async (query: string) => {
    if (!query.trim()) return;
    const cleanQuery = query.trim();
    const updated = [cleanQuery, ...history.filter((h) => h !== cleanQuery)].slice(0, 10);
    setHistory(updated);
    await AsyncStorage.setItem("aruvi:searchHistory", JSON.stringify(updated));
  };

  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem("aruvi:searchHistory");
  };

  const handleSelectQuery = (query: string) => {
    setQ(query);
    saveSearchHistory(query);
  };

  const handleSongPlay = (song: Song) => {
    saveSearchHistory(q || song.title);
    playSong(song, results.length > 0 ? results : [song]);
    router.push("/player");
  };

  const handleClear = () => {
    setQ("");
    setResults([]);
  };

  const currentSong = usePlayerStore((s) => s.current);
  const bottomPadding = currentSong ? 170 : 120;

  const topResult = results[0];
  const remainingSongs = results.slice(1);

  return (
    <AppScreen edges={["top"]}>
      <AppHeader title="Search" />
      
      {/* Search Input Bar */}
      <View className="px-5 py-3 flex-row items-center">
        <View className="flex-1">
          <SearchBar
            value={q}
            onChangeText={setQ}
            onSubmit={() => {
              Keyboard.dismiss();
              saveSearchHistory(q);
            }}
          />
          {q.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={10}>
              <Icon name="close" size={18} color={theme.secondaryText} />
            </Pressable>
          )}
        </View>
      </View>

      {loading && (
        <View className="px-5 pt-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      )}

      {!loading && (
        <React.Fragment>
          {q.length === 0 ? (
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPadding, paddingTop: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {history.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-xs uppercase font-bold tracking-wider" style={{ color: theme.secondaryText }}>
                      Recent Searches
                    </Text>
                    <Pressable onPress={clearHistory} hitSlop={12}>
                      <Text className="text-xs font-semibold" style={{ color: theme.accent }}>
                        Clear
                      </Text>
                    </Pressable>
                  </View>
                  <View className="flex-row flex-wrap">
                    {history.map((h, i) => (
                      <Pressable
                        key={i}
                        onPress={() => handleSelectQuery(h)}
                        className="px-4 py-1.5 rounded-full mr-2.5 mb-2.5 border active:bg-white/10"
                        style={{ backgroundColor: theme.card, borderColor: theme.border }}
                      >
                        <Text className="text-xs font-medium" style={{ color: theme.primaryText }}>{h}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View className="mb-6">
                <Text className="text-xs uppercase font-bold tracking-wider mb-3" style={{ color: theme.secondaryText }}>
                  Trending Searches
                </Text>
                <View className="flex-row flex-wrap">
                  {TRENDING_SEARCHES.map((term, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => handleSelectQuery(term)}
                      className="flex-row items-center px-3.5 py-2 rounded-2xl mr-2 mb-2 border active:bg-white/10"
                      style={{ backgroundColor: theme.card, borderColor: theme.border }}
                    >
                      <Icon name="search" size={14} color={theme.accent} />
                      <Text className="text-xs font-semibold ml-2" style={{ color: theme.primaryText }}>
                        {term}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-xs uppercase font-bold tracking-wider mb-3" style={{ color: theme.secondaryText }}>
                  Browse Categories
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {GENRES.map((g, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => handleSelectQuery(g)}
                      className="w-[48%] p-4 rounded-2xl mb-3 border justify-between h-20 active:opacity-90"
                      style={{ backgroundColor: theme.card, borderColor: theme.border }}
                    >
                      <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
                        {g}
                      </Text>
                      <View className="items-end">
                        <Icon name="music" size={16} color={theme.accent} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={remainingSongs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: bottomPadding }}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                topResult ? (
                  <View className="mb-4">
                    <Text className="text-xs uppercase font-bold tracking-wider px-5 mb-3" style={{ color: theme.secondaryText }}>
                      Top Result
                    </Text>
                    <Pressable
                      onPress={() => handleSongPlay(topResult)}
                      className="mx-5 p-4 rounded-3xl border flex-row items-center active:bg-white/5 mb-5 relative overflow-hidden"
                      style={{ backgroundColor: theme.card, borderColor: theme.border }}
                    >
                      <Image
                        source={{ uri: topResult.artwork }}
                        style={{ width: 68, height: 68, borderRadius: 16 }}
                        className="border border-white/5"
                      />
                      <View className="flex-1 ml-4 justify-center pr-8">
                        <Text className="text-base font-bold" numberOfLines={1} style={{ color: theme.primaryText }}>
                          {topResult.title}
                        </Text>
                        <Text className="text-xs font-semibold mt-0.5" style={{ color: theme.accent }}>
                          Song • {topResult.artist}
                        </Text>
                      </View>
                      <View 
                        className="w-10 h-10 rounded-full items-center justify-center absolute right-4" 
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Icon name="play" size={16} color="#000000" />
                      </View>
                    </Pressable>
                    {remainingSongs.length > 0 && (
                      <Text className="text-xs uppercase font-bold tracking-wider px-5 mb-2" style={{ color: theme.secondaryText }}>
                        Songs
                      </Text>
                    )}
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <SongRow
                  song={item}
                  liked={isLiked(item)}
                  onLike={() => toggleLike(item)}
                  onAddToQueue={() => addToQueue(item)}
                  onPress={() => handleSongPlay(item)}
                />
              )}
              ListEmptyComponent={
                results.length === 0 ? (
                  <EmptyState
                    iconName="search"
                    title="No results found"
                    description={`We couldn't find any songs matching "${q}". Try checking the spelling or use another search term.`}
                  />
                ) : null
              }
            />
          )}
        </React.Fragment>
      )}
    </AppScreen>
  );
}
