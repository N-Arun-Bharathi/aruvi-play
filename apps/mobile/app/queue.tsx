import React from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { AppScreen } from "../components/AppScreen";
import { AppHeader } from "../components/AppHeader";
import { SongRow } from "../components/SongRow";
import { Icon } from "../components/Icon";
import { usePlayerStore } from "../store/playerStore";
import { useLibraryStore } from "../store/likedStore";
import { QueueManager } from "../services/queueManager";
import { useTheme } from "../utils/theme";
import { useRouter } from "expo-router";

export default function QueueScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const [isEditing, setIsEditing] = React.useState(false);

  const currentSong = queue[index];
  const upcomingQueue = queue.slice(index + 1);

  // Statistics
  const totalSongs = queue.length;
  const remainingSongs = upcomingQueue.length;
  const totalDuration = queue.reduce((acc, song) => acc + (song.duration || 0), 0);
  const formattedDuration = Math.ceil(totalDuration / 60);

  const clearQueue = () => {
    Alert.alert(
      "Clear Queue",
      "Are you sure you want to clear all upcoming songs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            if (currentSong) {
              QueueManager.getInstance().syncQueue([currentSong]);
            } else {
              QueueManager.getInstance().syncQueue([]);
            }
          },
        },
      ]
    );
  };

  const removeSongFromQueue = (songId: string) => {
    const newQueue = queue.filter((s) => s.id !== songId);
    QueueManager.getInstance().syncQueue(newQueue);
  };

  const moveSongUp = (idxInQueue: number) => {
    if (idxInQueue <= index + 1) return;
    const newQueue = [...queue];
    const temp = newQueue[idxInQueue];
    newQueue[idxInQueue] = newQueue[idxInQueue - 1];
    newQueue[idxInQueue - 1] = temp;
    QueueManager.getInstance().syncQueue(newQueue);
  };

  const moveSongDown = (idxInQueue: number) => {
    if (idxInQueue >= queue.length - 1) return;
    const newQueue = [...queue];
    const temp = newQueue[idxInQueue];
    newQueue[idxInQueue] = newQueue[idxInQueue + 1];
    newQueue[idxInQueue + 1] = temp;
    QueueManager.getInstance().syncQueue(newQueue);
  };

  const moveSongToTop = (idxInQueue: number) => {
    if (idxInQueue <= index + 1) return;
    const newQueue = [...queue];
    const [song] = newQueue.splice(idxInQueue, 1);
    newQueue.splice(index + 1, 0, song);
    QueueManager.getInstance().syncQueue(newQueue);
  };

  const showSongOptions = (songName: string, idxInQueue: number, songId: string) => {
    Alert.alert(
      songName,
      "Manage position in queue",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Move to Next Play", onPress: () => moveSongToTop(idxInQueue) },
        { text: "Move Up", onPress: () => moveSongUp(idxInQueue) },
        { text: "Move Down", onPress: () => moveSongDown(idxInQueue) },
        { text: "Remove from Queue", onPress: () => removeSongFromQueue(songId), style: "destructive" },
      ]
    );
  };

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader
        title="Queue"
        showBack={false}
        rightActions={
          <View className="flex-row items-center">
            {remainingSongs > 0 && !isEditing && (
              <Pressable
                onPress={clearQueue}
                className="px-3 py-1.5 rounded-full mr-2 active:opacity-60"
                style={{ backgroundColor: theme.elevatedSurface }}
              >
                <Text className="text-xs font-semibold" style={{ color: theme.error }}>
                  Clear Queue
                </Text>
              </Pressable>
            )}
            {remainingSongs > 0 && (
              <Pressable
                onPress={() => setIsEditing(!isEditing)}
                className="px-4 py-1.5 rounded-full active:opacity-85"
                style={{ backgroundColor: isEditing ? theme.accent : theme.elevatedSurface }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: isEditing ? "#000000" : theme.primaryText }}
                >
                  {isEditing ? "Done" : "Edit"}
                </Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* Stats Card */}
      <View className="px-5 my-4">
        <View
          className="rounded-2xl p-4 border flex-row justify-between items-center"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <View className="items-center flex-1">
            <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: theme.mutedText }}>
              Total Songs
            </Text>
            <Text className="text-base font-bold mt-0.5" style={{ color: theme.primaryText }}>
              {totalSongs}
            </Text>
          </View>
          <View className="w-[1px] h-8" style={{ backgroundColor: theme.border }} />
          <View className="items-center flex-1">
            <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: theme.mutedText }}>
              Duration
            </Text>
            <Text className="text-base font-bold mt-0.5" style={{ color: theme.primaryText }}>
              {formattedDuration} min
            </Text>
          </View>
          <View className="w-[1px] h-8" style={{ backgroundColor: theme.border }} />
          <View className="items-center flex-1">
            <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: theme.mutedText }}>
              Upcoming
            </Text>
            <Text className="text-base font-bold mt-0.5" style={{ color: theme.primaryText }}>
              {remainingSongs}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={upcomingQueue}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View className="mb-4">
            <Text
              className="text-xs uppercase font-bold tracking-wider px-5 mb-2"
              style={{ color: theme.secondaryText }}
            >
              Now Playing
            </Text>
            {currentSong ? (
              <SongRow
                song={currentSong}
                isActive
                liked={isLiked(currentSong)}
                onLike={() => toggleLike(currentSong)}
                onPress={() => {}}
              />
            ) : (
              <Text className="text-sm px-5" style={{ color: theme.mutedText }}>
                Nothing playing
              </Text>
            )}
            
            {remainingSongs > 0 && (
              <Text
                className="text-xs uppercase font-bold tracking-wider px-5 mt-6 mb-2"
                style={{ color: theme.secondaryText }}
              >
                Next In Queue
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index: idx }) => {
          const absoluteIdx = index + 1 + idx;
          return (
            <View className="flex-row items-center">
              {isEditing && (
                <View className="flex-row items-center pl-4 pr-1">
                  <Pressable
                    disabled={idx === 0}
                    onPress={() => moveSongUp(absoluteIdx)}
                    className="p-1 mr-1 active:opacity-60"
                    style={{ opacity: idx === 0 ? 0.2 : 1 }}
                  >
                    <View style={{ transform: [{ rotate: "180deg" }] }}>
                      <Icon name="chevron-down" size={20} color={theme.secondaryText} />
                    </View>
                  </Pressable>
                  <Pressable
                    disabled={idx === upcomingQueue.length - 1}
                    onPress={() => moveSongDown(absoluteIdx)}
                    className="p-1 active:opacity-60"
                    style={{ opacity: idx === upcomingQueue.length - 1 ? 0.2 : 1 }}
                  >
                    <Icon name="chevron-down" size={20} color={theme.secondaryText} />
                  </Pressable>
                </View>
              )}
              <View className="flex-1">
                <SongRow
                  song={item}
                  liked={isLiked(item)}
                  onLike={() => toggleLike(item)}
                  onPress={() => {
                    if (isEditing) {
                      showSongOptions(item.title, absoluteIdx, item.id);
                    } else {
                      const { usePlayerStore } = require("../store/playerStore");
                      usePlayerStore.getState().playSong(item, queue);
                    }
                  }}
                />
              </View>
              {isEditing && (
                <Pressable
                  onPress={() => removeSongFromQueue(item.id)}
                  className="pr-4 pl-2 py-3 active:opacity-60"
                >
                  <Icon name="trash" size={20} color={theme.error} />
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !currentSong ? null : (
            <Text className="text-sm px-5 text-center mt-8" style={{ color: theme.mutedText }}>
              No upcoming songs. Queue is empty.
            </Text>
          )
        }
      />
    </AppScreen>
  );
}
