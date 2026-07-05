import React, { useState, useMemo } from "react";
import { View, Text, FlatList, Pressable, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { SongRow } from "../../components/SongRow";
import { Icon } from "../../components/Icon";
import { Song } from "../../types/song";
import { pickLocalSongs } from "../../services/localFiles";
import { useScrollHandler } from "../../hooks/useScrollHandler";

type Tab = "liked" | "collection" | "local";

export default function Library() {
  const { liked, likedJson, isLiked, toggleLike, resolveAndPlay } = useLibraryStore();
  const { playSong, addToQueue } = usePlayerStore();
  const [tab, setTab] = useState<Tab>("collection");
  const [local, setLocal] = useState<Song[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const onScroll = useScrollHandler();

  const filteredData = useMemo(() => {
    const raw = tab === "collection" ? likedJson : tab === "liked" ? liked : local;
    if (!search.trim()) return raw;
    const q = search.toLowerCase();
    return raw.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.artist.toLowerCase().includes(q)
    );
  }, [tab, liked, likedJson, local, search]);

  async function importLocal() {
    try {
      const songs = await pickLocalSongs();
      if (songs.length) setLocal((prev) => [...songs, ...prev]);
    } catch (e: any) {
      Alert.alert("Failed to import", String(e?.message ?? e));
    }
  }

  const handleJsonPress = async (item: any) => {
    setResolvingId(item.title + item.artist);
    try {
      await resolveAndPlay(item, likedJson);
    } finally {
      setResolvingId(null);
    }
  };

  const playAllJson = async (shuffle = false) => {
    if (!likedJson.length) return;
    const list = shuffle ? [...likedJson].sort(() => Math.random() - 0.5) : likedJson;
    handleJsonPress(list[0]);
  };

  const renderCollectionItem = (item: any, index: number) => {
    const song: Song = {
      id: item.id || `json:${item.title}-${item.artist}-${index}`,
      title: item.title,
      artist: item.artist,
      album: item.album || "",
      artwork: item.artwork || "",
      url: item.url || "",
      duration: item.duration || 0,
      source: "online",
    };
    
    return (
      <SongRow
        song={song}
        liked={isLiked(song)}
        onLike={() => toggleLike(song)}
        onAddToQueue={() => addToQueue(song)}
        onPress={() => handleJsonPress(item)}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="px-5 pt-4">
        <Text className="text-text text-3xl font-bold mb-4">Library</Text>
        
        {/* Tab Buttons with Capsule Pill styling */}
        <View className="flex-row bg-surface p-1 rounded-2xl mb-4 border border-white/5">
          <TabButton
            active={tab === "collection"}
            label="Collection"
            onPress={() => setTab("collection")}
          />
          <TabButton
            active={tab === "liked"}
            label="Liked Songs"
            onPress={() => setTab("liked")}
          />
          <TabButton
            active={tab === "local"}
            label="Local Files"
            onPress={() => setTab("local")}
          />
        </View>

        {/* Apple Music Style Minimalist Search Bar */}
        <View className="flex-row items-center bg-surface px-4 py-2.5 rounded-xl mb-4 border border-white/5">
          <Icon name="search" size={16} color="#A0A0A0" />
          <TextInput
            className="flex-1 ml-3 text-text text-sm"
            placeholder={`Search ${tab === "collection" ? "collection" : tab === "liked" ? "liked songs" : "local files"}...`}
            placeholderTextColor="#7A7A7A"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <View style={{ transform: [{ rotate: "45deg" }] }}>
                <Icon name="plus" size={16} color="#A0A0A0" />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {tab === "collection" && filteredData.length > 0 && !search && (
        <View className="flex-row px-5 mb-4">
          <Pressable
            onPress={() => playAllJson(false)}
            className="flex-1 flex-row items-center justify-center bg-accent py-3 rounded-2xl mr-2.5 active:opacity-80"
          >
            <Icon name="play" size={18} color="black" />
            <Text className="text-black font-bold ml-2 text-sm">Play All</Text>
          </Pressable>
          <Pressable
            onPress={() => playAllJson(true)}
            className="flex-1 flex-row items-center justify-center bg-surface py-3 rounded-2xl ml-2.5 border border-white/10 active:bg-white/10"
          >
            <Icon name="shuffle" size={18} color="white" />
            <Text className="text-text font-bold ml-2 text-sm">Shuffle</Text>
          </Pressable>
        </View>
      )}

      {tab === "local" && (
        <Pressable
          onPress={importLocal}
          className="mx-5 mb-4 flex-row items-center bg-surface rounded-2xl p-4 active:opacity-75 border border-white/5"
        >
          <Icon name="folder" size={20} color="#1DB954" />
          <Text className="text-text ml-3 font-semibold text-sm">Import local audio files</Text>
        </Pressable>
      )}

      <FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={filteredData}
        keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
        contentContainerStyle={{ paddingBottom: 180 }}
        renderItem={({ item, index }) => {
          if (tab === "collection") {
            return renderCollectionItem(item, index);
          }
          return (
            <SongRow
              song={item}
              liked={isLiked(item)}
              onLike={() => toggleLike(item)}
              onAddToQueue={() => addToQueue(item)}
              onPress={() => playSong(item, tab === "liked" ? liked : local)}
            />
          );
        }}
        ListEmptyComponent={
          <View className="px-5 mt-16 items-center justify-center">
            <Icon
              name={tab === "liked" ? "heart" : tab === "collection" ? "library" : "folder"}
              size={48}
              color="#333"
            />
            <Text className="text-muted text-center mt-4 text-sm font-medium">
              {tab === "liked"
                ? "Liked songs will appear here."
                : tab === "collection"
                ? "Your offline collection is empty."
                : "No local audio files imported."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2 rounded-xl items-center ${
        active ? "bg-white/10" : "bg-transparent"
      }`}
    >
      <Text className={`text-xs font-semibold ${active ? "text-text" : "text-muted"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
