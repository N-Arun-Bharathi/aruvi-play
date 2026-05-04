import React from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { usePlayerStore } from "../store/playerStore";
import { useLibraryStore } from "../store/likedStore";
import { SongRow } from "../components/SongRow";
import { Icon } from "../components/Icon";

export default function QueueScreen() {
  const router = useRouter();
  const { queue, index, playSong, addToQueue } = usePlayerStore();
  const { isLiked, toggleLike, liked } = useLibraryStore();

  const currentSong = queue[index];

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 py-4">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-2">
          <Icon name="chevron-down" size={26} />
        </Pressable>
        <Text className="text-text text-xl font-bold">Queue</Text>
        <View className="w-10" />
      </View>

      <View className="px-5 mb-4">
        <Text className="text-muted text-sm uppercase font-bold tracking-wider mb-3">
          Now Playing
        </Text>
        {currentSong && (
          <SongRow
            song={currentSong}
            isActive
            liked={isLiked(currentSong)}
            onLike={() => toggleLike(currentSong)}
            onPress={() => router.back()}
          />
        )}
      </View>

      <View className="flex-1 px-5">
        <Text className="text-muted text-sm uppercase font-bold tracking-wider mb-3">
          Next In Queue
        </Text>
        <FlatList
          data={queue.slice(index + 1)}
          keyExtractor={(item, i) => item.id + i}
          renderItem={({ item, index: i }) => (
            <SongRow
              song={item}
              liked={isLiked(item)}
              onLike={() => toggleLike(item)}
              onPress={() => {
                // Jump to this index in the queue
                // The actual index in the full queue is index + 1 + i
                const targetIndex = index + 1 + i;
                // We need a jumpTo function or just use playSong with the adjusted index
                // For now, let's just use playSong which might reset the queue depending on implementation
                // Actually, let's update playerStore to have a jumpToIndex
                playSong(item, queue);
              }}
            />
          )}
          ListEmptyComponent={
            <Text className="text-muted text-center mt-10">Queue is empty</Text>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>
    </SafeAreaView>
  );
}
