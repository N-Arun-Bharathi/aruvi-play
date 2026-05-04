import React from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { usePlayerStore } from "../store/playerStore";
import { useLibraryStore } from "../store/likedStore";
import { PlayerControls } from "../components/PlayerControls";
import { SeekBar } from "../components/SeekBar";
import { Icon } from "../components/Icon";
import { AnimatedHeart } from "../components/AnimatedHeart";

import { useTimerStore } from "../store/timerStore";
import { Alert } from "react-native";

export default function PlayerScreen() {
  const router = useRouter();
  const current = usePlayerStore((s) => s.current);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const { isLiked, toggleLike, liked: likedSongs } = useLibraryStore();
  const { timeLeft, setTimer } = useTimerStore();
  
  const { width } = Dimensions.get("window");
  const artSize = Math.min(width - 48, 360);

  const showTimerOptions = () => {
    Alert.alert(
      "Sleep Timer",
      timeLeft ? `Current timer: ${Math.ceil(timeLeft / 60)}m left` : "Stop playback after:",
      [
        { text: "15 minutes", onPress: () => setTimer(15) },
        { text: "30 minutes", onPress: () => setTimer(30) },
        { text: "60 minutes", onPress: () => setTimer(60) },
        { text: "Off", onPress: () => setTimer(null), style: "destructive" },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  if (!current) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-muted">Nothing playing</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-accent">Close</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const liked = isLiked(current);

  return (
    <View className="flex-1 bg-bg">
      <LinearGradient
        colors={["#1F1F1F", "#0A0A0A"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 400 }}
      />
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable onPress={() => router.back()} hitSlop={12} className="p-2">
            <Icon name="chevron-down" size={26} />
          </Pressable>
          
          <View className="items-center">
            <Text className="text-text text-xs opacity-50 uppercase font-bold tracking-widest">Now playing</Text>
            {timeLeft && (
              <View className="flex-row items-center mt-1">
                <Icon name="clock" size={12} color="#EF4444" />
                <Text className="text-accent text-[10px] font-bold ml-1">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center">
            <Pressable onPress={() => router.push("/queue")} hitSlop={12} className="p-2 mr-1">
              <Icon name="list" size={22} />
            </Pressable>
            <Pressable onPress={showTimerOptions} hitSlop={12} className="p-2">
              <Icon name="clock" size={22} color={timeLeft ? "#EF4444" : "#FFFFFF"} />
            </Pressable>
          </View>
        </View>

        <View className="flex-1 px-6 justify-center items-center">
          <View
            style={{ width: artSize, height: artSize }}
            className="rounded-2xl bg-surface2 overflow-hidden items-center justify-center"
          >
            {current.artwork ? (
              <Image
                source={{ uri: current.artwork }}
                style={{ width: artSize, height: artSize }}
                contentFit="cover"
              />
            ) : (
              <Icon name="music" size={64} color="#A0A0A0" />
            )}
          </View>
        </View>

        <View className="px-6">
          <View className="flex-row items-center">
            <View className="flex-1 pr-4">
              <Text className="text-text text-2xl font-bold" numberOfLines={1}>
                {current.title}
              </Text>
              <Text className="text-muted mt-1" numberOfLines={1}>
                {current.artist}
              </Text>
            </View>
            <AnimatedHeart
              liked={liked}
              onPress={() => toggleLike(current)}
              size={28}
              activeColor="#EF4444"
              inactiveColor="#FFFFFF"
            />
          </View>

          <SeekBar />
          <PlayerControls />
        </View>

        <View className="h-10" />
      </SafeAreaView>
    </View>
  );
}
