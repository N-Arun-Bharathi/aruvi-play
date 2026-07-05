import React from "react";
import { View, Text, FlatList, Pressable, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayerStore } from "../../store/playerStore";
import { useLibraryStore } from "../../store/likedStore";
import { SongRow } from "../../components/SongRow";
import { Icon } from "../../components/Icon";
import { useScrollHandler } from "../../hooks/useScrollHandler";
import { QueueManager } from "../../services/queueManager";

export default function QueueScreen() {
  const { queue, index, playSong } = usePlayerStore();
  const { isLiked, toggleLike } = useLibraryStore();
  const onScroll = useScrollHandler();

  const [isEditing, setIsEditing] = React.useState(false);
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const draggedIndexRef = React.useRef<number | null>(null);

  const currentSong = queue[index];
  const upcomingQueue = queue.slice(index + 1);

  const handleDragStart = (idx: number) => {
    draggedIndexRef.current = idx;
    setDraggingIndex(idx);
  };

  const handleDragOver = (e: any) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
  };

  const handleDragEnter = (idx: number) => {
    const fromIdx = draggedIndexRef.current;
    if (fromIdx !== null && fromIdx !== idx) {
      const newQueue = [...queue];
      const [draggedItem] = newQueue.splice(fromIdx, 1);
      newQueue.splice(idx, 0, draggedItem);

      draggedIndexRef.current = idx;
      setDraggingIndex(idx);

      QueueManager.getInstance().syncQueue(newQueue);
    }
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
    setDraggingIndex(null);
  };

  // Statistics
  const totalSongs = queue.length;
  const remainingSongs = upcomingQueue.length;
  const totalDuration = queue.reduce((acc, song) => acc + (song.duration || 0), 0);
  const formattedDuration = Math.ceil(totalDuration / 60);

  React.useEffect(() => {
    if (remainingSongs === 0 && isEditing) {
      setIsEditing(false);
    }
  }, [remainingSongs, isEditing]);

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
    if (idxInQueue <= index + 1) return; // Can't move past or swap with current song
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
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <Text className="text-text text-2xl font-bold">Queue</Text>
        <View className="flex-row items-center">
          {remainingSongs > 0 && !isEditing && (
            <Pressable onPress={clearQueue} className="px-3 py-1.5 bg-white/10 rounded-full active:bg-white/20 mr-2">
              <Text className="text-xs text-text font-semibold">Clear Queue</Text>
            </Pressable>
          )}
          {remainingSongs > 0 && (
            <Pressable 
              onPress={() => setIsEditing(!isEditing)} 
              className={`px-3 py-1.5 rounded-full ${isEditing ? "bg-accent" : "bg-white/10"} active:bg-white/20`}
            >
              <Text className={`text-xs font-semibold ${isEditing ? "text-[#0A0A0A]" : "text-text"}`}>
                {isEditing ? "Done" : "Edit"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Queue Statistics Card */}
      <View className="px-5 mb-4">
        <View className="bg-surface rounded-2xl p-4 border border-white/5 flex-row justify-between items-center">
          <View>
            <Text className="text-muted text-[10px] uppercase font-bold tracking-wider">Queue Length</Text>
            <Text className="text-text text-base font-bold mt-0.5">{totalSongs} songs</Text>
          </View>
          <View className="w-[1px] h-8 bg-white/10" />
          <View>
            <Text className="text-muted text-[10px] uppercase font-bold tracking-wider">Estimated Duration</Text>
            <Text className="text-text text-base font-bold mt-0.5">{formattedDuration} mins</Text>
          </View>
          <View className="w-[1px] h-8 bg-white/10" />
          <View>
            <Text className="text-muted text-[10px] uppercase font-bold tracking-wider">Remaining</Text>
            <Text className="text-text text-base font-bold mt-0.5">{remainingSongs} upcoming</Text>
          </View>
        </View>
      </View>

      <FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={upcomingQueue}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-4">
            <Text className="text-muted text-xs uppercase font-bold tracking-wider px-5 mb-3">
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
              <Text className="text-muted text-center py-4">Nothing playing</Text>
            )}
            {upcomingQueue.length > 0 && (
              <Text className="text-muted text-xs uppercase font-bold tracking-wider px-5 mt-6 mb-2">
                {isEditing ? "Next Up (Editing)" : "Next Up (Tap song for reordering options)"}
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index: i }) => {
          const absoluteIdx = index + 1 + i;
          return (
            <View 
              className="flex-row items-center pr-3"
              style={{
                opacity: draggingIndex === absoluteIdx ? 0.4 : 1,
                userSelect: Platform.OS === 'web' && isEditing ? 'none' : 'auto',
              } as any}
              // @ts-ignore
              onDragOver={Platform.OS === 'web' ? handleDragOver : undefined}
              // @ts-ignore
              onDragEnter={Platform.OS === 'web' ? () => handleDragEnter(absoluteIdx) : undefined}
            >
              {isEditing && (
                <View 
                  className="pl-4 pr-1 py-3 justify-center items-center"
                  // @ts-ignore
                  draggable={Platform.OS === 'web'}
                  onDragStart={Platform.OS === 'web' ? () => handleDragStart(absoluteIdx) : undefined}
                  onDragEnd={Platform.OS === 'web' ? handleDragEnd : undefined}
                  style={{
                    cursor: Platform.OS === 'web' ? 'grab' : 'default',
                  } as any}
                >
                  <Icon name="drag-handle" size={20} color="#A0A0A0" />
                </View>
              )}
              <View className="flex-1">
                <SongRow
                  song={item}
                  liked={isLiked(item)}
                  onLike={() => toggleLike(item)}
                  onPress={isEditing ? () => {} : () => showSongOptions(item.title, absoluteIdx, item.id)}
                />
              </View>
              {isEditing ? (
                <View className="flex-row items-center">
                  {Platform.OS !== 'web' && (
                    <>
                      {/* Move Up */}
                      <Pressable
                        onPress={() => moveSongUp(absoluteIdx)}
                        disabled={absoluteIdx === index + 1}
                        hitSlop={8}
                        className="p-1.5 mr-0.5"
                        style={({ pressed }) => ({
                          opacity: absoluteIdx === index + 1 ? 0.25 : pressed ? 0.5 : 1,
                        })}
                      >
                        <View style={{ transform: [{ rotate: "180deg" }] }}>
                          <Icon name="chevron-down" size={18} color="#FFFFFF" />
                        </View>
                      </Pressable>

                      {/* Move Down */}
                      <Pressable
                        onPress={() => moveSongDown(absoluteIdx)}
                        disabled={absoluteIdx === queue.length - 1}
                        hitSlop={8}
                        className="p-1.5 mr-1"
                        style={({ pressed }) => ({
                          opacity: absoluteIdx === queue.length - 1 ? 0.25 : pressed ? 0.5 : 1,
                        })}
                      >
                        <Icon name="chevron-down" size={18} color="#FFFFFF" />
                      </Pressable>
                    </>
                  )}

                  {/* Quick Remove Button */}
                  <Pressable
                    onPress={() => removeSongFromQueue(item.id)}
                    hitSlop={8}
                    className="p-1.5"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <View style={{ transform: [{ rotate: "45deg" }] }}>
                      <Icon name="plus" size={18} color="#FF453A" />
                    </View>
                  </Pressable>
                </View>
              ) : (
                /* Quick Remove Button */
                <Pressable
                  onPress={() => removeSongFromQueue(item.id)}
                  hitSlop={12}
                  className="p-2"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <View style={{ transform: [{ rotate: "45deg" }] }}>
                    <Icon name="plus" size={20} color="#FF453A" />
                  </View>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          upcomingQueue.length === 0 && currentSong ? (
            <Text className="text-muted text-center mt-10">No upcoming songs. Smart Mode is active to extend queue.</Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 180 }}
      />
    </SafeAreaView>
  );
}
