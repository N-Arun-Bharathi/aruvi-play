import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SearchBar } from "../../components/SearchBar";
import { SongRow } from "../../components/SongRow";
import { searchSongs } from "../../services/saavn";
import { Song } from "../../types/song";
import { usePlayerStore } from "../../store/playerStore";
import { useLibraryStore } from "../../store/likedStore";

export default function Search() {
  const router = useRouter();
  const { playSong, addToQueue } = usePlayerStore();
  const { isLiked, toggleLike, liked } = useLibraryStore();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchSongs(q);
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [q]);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-5 pt-4">
        <Text className="text-text text-3xl font-bold mb-4">Search</Text>
        <SearchBar
          value={q}
          onChangeText={setQ}
          onSubmit={() => Keyboard.dismiss()}
        />
      </View>
      {loading ? (
        <View className="py-8 items-center">
          <ActivityIndicator color="#EF4444" />
        </View>
      ) : null}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <SongRow
            song={item}
            liked={isLiked(item)}
            onLike={() => toggleLike(item)}
            onAddToQueue={() => addToQueue(item)}
            onPress={() => {
              const { smartMode, playSmart, playSong } = usePlayerStore.getState();
              if (smartMode) {
                playSmart(item);
              } else {
                playSong(item, results);
              }
              router.push("/player");
            }}
          />
        )}
        ListEmptyComponent={
          !loading && q.length > 0 ? (
            <Text className="text-muted text-center mt-12">No results</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
