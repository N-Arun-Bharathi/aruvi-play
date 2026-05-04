import React, { useState } from "react";
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { SongRow } from "../../components/SongRow";
import { Icon } from "../../components/Icon";
import { Song } from "../../types/song";
import { pickLocalSongs } from "../../services/localFiles";

type Tab = "liked" | "collection" | "local";

export default function Library() {
  const { liked, likedJson, isLiked, toggleLike, resolveAndPlay } = useLibraryStore();
  const playSong = usePlayerStore((s) => s.playSong);
  const [tab, setTab] = useState<Tab>("collection");
  const [local, setLocal] = useState<Song[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-5 pt-4">
        <Text className="text-text text-3xl font-bold mb-4">Your library</Text>
        <View className="flex-row mb-4 overflow-hidden">
          <TabButton
            active={tab === "collection"}
            label="Collection"
            onPress={() => setTab("collection")}
          />
          <TabButton
            active={tab === "liked"}
            label="Liked"
            onPress={() => setTab("liked")}
          />
          <TabButton
            active={tab === "local"}
            label="Local"
            onPress={() => setTab("local")}
          />
        </View>
      </View>

      {tab === "collection" && likedJson.length > 0 && (
        <View className="flex-row px-5 mb-4">
          <Pressable
            onPress={() => playAllJson(false)}
            className="flex-1 flex-row items-center justify-center bg-accent py-3 rounded-lg mr-2"
          >
            <Icon name="play" size={20} color="black" />
            <Text className="text-black font-bold ml-2">Play All</Text>
          </Pressable>
          <Pressable
            onPress={() => playAllJson(true)}
            className="flex-1 flex-row items-center justify-center bg-surface py-3 rounded-lg ml-2 border border-white/10"
          >
            <Icon name="shuffle" size={20} color="white" />
            <Text className="text-text font-bold ml-2">Shuffle</Text>
          </Pressable>
        </View>
      )}

      {tab === "local" && (
        <Pressable
          onPress={importLocal}
          className="mx-5 mb-4 flex-row items-center bg-surface rounded-lg p-4 active:opacity-70 border border-white/5"
        >
          <Icon name="folder" size={22} color="#1DB954" />
          <Text className="text-text ml-3 font-medium">Import audio files</Text>
        </Pressable>
      )}

      <FlatList
        data={tab === "collection" ? likedJson : tab === "liked" ? liked : local}
        keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => {
          if (tab === "collection") {
            const isResolving = resolvingId === (item.title + item.artist);
            return (
              <Pressable
                onPress={() => handleJsonPress(item)}
                className="flex-row items-center px-5 py-3 active:opacity-60"
              >
                <View className="w-12 h-12 rounded bg-surface2 items-center justify-center">
                  {isResolving ? (
                    <ActivityIndicator size="small" color="#1DB954" />
                  ) : (
                    <Icon name="music" size={20} color="#555" />
                  )}
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-text text-base font-bold" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="text-muted text-sm mt-1" numberOfLines={1}>
                    {item.artist.split(";").join(", ")} • {item.album}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color="#333" />
              </Pressable>
            );
          }
          return (
            <SongRow
              song={item}
              liked={isLiked(item.id)}
              onLike={() => toggleLike(item)}
              onPress={() => playSong(item, tab === "liked" ? liked : local)}
            />
          );
        }}
        ListEmptyComponent={
          <View className="px-5 mt-12 items-center">
            <Icon
              name={tab === "liked" ? "heart" : tab === "collection" ? "library" : "music"}
              size={48}
              color="#222"
            />
            <Text className="text-muted text-center mt-4">
              {tab === "liked"
                ? "Songs you like will appear here."
                : tab === "collection"
                ? "No songs found in your local collection."
                : "No local files imported."}
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
      className={`px-4 py-2 rounded-full mr-2 ${
        active ? "bg-accent" : "bg-surface"
      }`}
    >
      <Text className={active ? "text-black font-semibold" : "text-text"}>
        {label}
      </Text>
    </Pressable>
  );
}
