import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SearchBar } from "../../components/SearchBar";
import { SongRow } from "../../components/SongRow";
import { searchSongs } from "../../services/saavn";
import { Song } from "../../types/song";
import { usePlayerStore } from "../../store/playerStore";
import { useLibraryStore } from "../../store/likedStore";
import { Icon } from "../../components/Icon";
import { useScrollHandler } from "../../hooks/useScrollHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TRENDING_SEARCHES = ["Kaavala", "Hukum", "Anirudh Hits", "A.R. Rahman", "Harris Melody", "Leo Theme"];
const GENRES = ["Melodies", "Kuthu / Dance", "Romantic Hits", "Gaana Beat", "Devotional", "90s Golden"];

export default function Search() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefill?: string }>();
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playSmart = usePlayerStore((s) => s.playSmart);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const onScroll = useScrollHandler();

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const abortControllerRef = useRef<AbortController | null>(null);

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
    }, 300); // 300ms debounce
    
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
    const { smartMode } = usePlayerStore.getState();
    if (smartMode) {
      playSmart(song);
    } else {
      playSong(song, results);
    }
    router.push("/player");
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Top Header & SearchBar */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-text text-3xl font-bold mb-4">Search</Text>
        <View className="flex-row items-center">
          <View className="flex-1">
            <SearchBar
              value={q}
              onChangeText={setQ}
              onSubmit={() => {
                Keyboard.dismiss();
                saveSearchHistory(q);
              }}
            />
          </View>
          {/* Voice Search Placeholder */}
          <Pressable
            onPress={() => Alert.alert("Voice Search", "Microphone permission is required for voice search.")}
            className="p-3 bg-surface rounded-full border border-white/5 ml-2.5"
          >
            <Icon name="music" size={18} color="#1DB954" />
          </Pressable>
        </View>
      </View>

      {loading && (
        <View className="py-6 items-center">
          <ActivityIndicator color="#1DB954" />
        </View>
      )}

      {/* Conditional layout: show suggestions/recent searches or search results */}
      {q.length === 0 ? (
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Search History */}
          {history.length > 0 && (
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-muted text-xs uppercase font-bold tracking-wider">
                  Recent Searches
                </Text>
                <Pressable onPress={clearHistory} hitSlop={12}>
                  <Text className="text-accent text-xs font-semibold">Clear</Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap">
                {history.map((h, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handleSelectQuery(h)}
                    className="px-3.5 py-1.5 bg-surface rounded-full border border-white/5 mr-2 mb-2 active:bg-white/10"
                  >
                    <Text className="text-text text-xs">{h}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Trending Searches */}
          <View className="mb-6">
            <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-3">
              Trending Searches
            </Text>
            <View className="bg-surface rounded-2xl overflow-hidden border border-white/5">
              {TRENDING_SEARCHES.map((t, idx) => (
                <Pressable
                  key={t}
                  onPress={() => handleSelectQuery(t)}
                  className={`flex-row items-center p-4 active:bg-white/5 ${
                    idx < TRENDING_SEARCHES.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <Icon name="search" size={14} color="#1DB954" />
                  <Text className="text-text font-semibold ml-3 text-sm">{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Genre Chips */}
          <View>
            <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-3">
              Browse Categories
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {GENRES.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => handleSelectQuery(g.replace(" / ", " "))}
                  style={{ width: "48%" }}
                  className="h-20 bg-surface rounded-2xl p-4 mb-4 border border-white/5 justify-end active:bg-white/10"
                >
                  <Text className="text-text font-bold text-base leading-snug">{g}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          onScroll={onScroll}
          scrollEventThrottle={16}
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 180 }}
          keyboardShouldPersistTaps="handled"
          getItemLayout={(data, index) => ({ length: 72, offset: 72 * index, index })}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
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
            !loading ? (
              <Text className="text-muted text-center mt-12">No results found</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// Alert helper block mock
import { Alert } from "react-native";
