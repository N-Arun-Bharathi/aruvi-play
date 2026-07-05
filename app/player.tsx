import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Dimensions, Alert, Share, StyleSheet, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import Slider from "@react-native-community/slider";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { usePlayerStore } from "../store/playerStore";
import { useLibraryStore } from "../store/likedStore";
import { PlayerControls } from "../components/PlayerControls";
import { SeekBar } from "../components/SeekBar";
import { Icon } from "../components/Icon";
import { AnimatedHeart } from "../components/AnimatedHeart";
import { AnimatedWaveform } from "../components/AnimatedWaveform";
import { useTimerStore } from "../store/timerStore";
import { tryGetPlayer } from "../services/trackPlayer";

const { width, height } = Dimensions.get("window");

export default function PlayerScreen() {
  const router = useRouter();
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const setTimer = useTimerStore((s) => s.setTimer);
  const currentContext = usePlayerStore((s) => s.currentContext);
  const [volume, setVolume] = useState(1.0);
  const [showLyrics, setShowLyrics] = useState(false);

  // Artwork Animation: Scales up when playing, down when paused
  const artworkScale = useSharedValue(1.0);

  useEffect(() => {
    artworkScale.value = withSpring(isPlaying ? 1.0 : 0.85, {
      damping: 15,
      stiffness: 100,
    });
  }, [isPlaying]);

  const animatedArtworkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: artworkScale.value }],
    };
  });

  // Track player volume initialization
  useEffect(() => {
    const player = tryGetPlayer();
    if (player) {
      setVolume(player.volume);
    }
  }, [current]);

  const onVolumeChange = (val: number) => {
    setVolume(val);
    const player = tryGetPlayer();
    if (player) {
      player.volume = val;
    }
  };

  const handleShare = async () => {
    if (!current) return;
    try {
      await Share.share({
        message: `Listening to "${current.title}" by ${current.artist} on Aruvi Play! 🎧🔥 Join the vibe.`,
      });
    } catch (error) {
      console.error("Error sharing song:", error);
    }
  };

  const showTimerOptions = () => {
    const activeTimeLeft = useTimerStore.getState().timeLeft;
    Alert.alert(
      "Sleep Timer",
      activeTimeLeft ? `Current timer: ${Math.ceil(activeTimeLeft / 60)}m left` : "Stop playback after:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "15 Min", onPress: () => setTimer(15) },
        { text: "30 Min", onPress: () => setTimer(30) },
        { text: "60 Min", onPress: () => setTimer(60) },
        { text: "Turn Off", onPress: () => setTimer(null), style: "destructive" },
      ],
      { cancelable: true }
    );
  };

  if (!current) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-muted">Nothing playing</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-4 py-2 bg-white/10 rounded-full">
          <Text className="text-text font-semibold">Close</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const liked = isLiked(current);
  const artSize = Math.min(width - 64, 320);

  return (
    <View className="flex-1 bg-bg">
      {/* Background Album Art Blur */}
      {current.artwork ? (
        <Image
          source={{ uri: current.artwork }}
          style={StyleSheet.absoluteFill}
          className="opacity-30"
          blurRadius={50}
        />
      ) : (
        <View style={StyleSheet.absoluteFill} className="bg-[#121212]" />
      )}

      {/* Glassmorphic dark overlay */}
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />

      <SafeAreaView className="flex-1 justify-between px-6" edges={["top", "bottom"]}>
        {/* Drag / Dismiss Handle */}
        <View className="items-center mt-2">
          <View className="w-12 h-1.5 bg-white/20 rounded-full mb-3" />
        </View>

        {/* Top Header Row */}
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} hitSlop={12} className="p-2 bg-white/10 rounded-full">
            <Icon name="chevron-down" size={24} />
          </Pressable>
          
          <SleepTimerHeader onTimerPress={showTimerOptions} />
        </View>

        {/* Big Artwork Section */}
        <View className="flex-1 justify-center items-center my-6">
          <Animated.View
            style={[
              { width: artSize, height: artSize },
              styles.artworkContainer,
              animatedArtworkStyle,
            ]}
            className="rounded-[32px] bg-surface overflow-hidden shadow-2xl border border-white/15"
          >
            {current.artwork ? (
              <Image
                source={{ uri: current.artwork }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-surface2">
                <Icon name="music" size={80} color="#A0A0A0" />
              </View>
            )}
          </Animated.View>
        </View>

        {/* Title, Artist and Like */}
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-1 pr-6">
            <Text className="text-text text-2xl font-bold" numberOfLines={1}>
              {current.title}
            </Text>
            <Text className="text-muted text-base mt-1" numberOfLines={1}>
              {current.artist}
            </Text>
          </View>
          <AnimatedHeart
            liked={liked}
            onPress={() => toggleLike(current)}
            size={28}
            activeColor="#FF453A"
            inactiveColor="#FFFFFF"
          />
        </View>

        {/* Waveform Visualization */}
        <View className="my-2">
          <AnimatedWaveform isPlaying={isPlaying} />
        </View>

        {/* SeekBar Controls */}
        <View className="my-2">
          <SeekBar />
        </View>

        {/* Primary Playback controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
        <View className="my-2">
          <PlayerControls />
        </View>

        {/* Volume Slider Section */}
        <View className="flex-row items-center px-2 my-2">
          <Icon name="music" size={14} color="#8E8E93" />
          <Slider
            style={{ flex: 1, height: 40, marginHorizontal: 12 }}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={onVolumeChange}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#FFFFFF"
          />
          <Icon name="music" size={18} color="#FFFFFF" />
        </View>

        {/* Footer Actions (Lyrics, Queue, Share, Smart Mode) */}
        <View className="flex-row items-center justify-between pb-6 pt-2 border-t border-white/5">
          <Pressable
            onPress={() => setShowLyrics(true)}
            className="flex-row items-center px-3 py-2 bg-white/5 rounded-full active:bg-white/10"
          >
            <Icon name="lyrics" size={16} />
            <Text className="text-text text-xs font-semibold ml-1.5">Lyrics</Text>
          </Pressable>



          <View className="flex-row items-center">
            <Pressable
              onPress={handleShare}
              className="p-2.5 bg-white/5 rounded-full mr-2 active:bg-white/10"
              hitSlop={8}
            >
              <Icon name="share" size={16} />
            </Pressable>
            
            <Pressable
              onPress={() => {
                router.back();
                router.push("/queue");
              }}
              className="p-2.5 bg-white/5 rounded-full active:bg-white/10"
              hitSlop={8}
            >
              <Icon name="list" size={16} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Glassmorphic Lyrics Overlay Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showLyrics}
        onRequestClose={() => setShowLyrics(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <BlurView intensity={90} tint="dark" className="h-[75%] rounded-t-[32px] overflow-hidden border-t border-white/10">
            <SafeAreaView className="flex-1" edges={["bottom"]}>
              <View className="flex-row justify-between items-center px-6 py-5 border-b border-white/5">
                <Text className="text-text text-lg font-bold">Lyrics</Text>
                <Pressable onPress={() => setShowLyrics(false)} className="px-3 py-1 bg-white/10 rounded-full">
                  <Text className="text-text text-xs font-semibold">Close</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text className="text-accent text-sm font-bold uppercase tracking-wider mb-2">
                  {current.title}
                </Text>
                <Text className="text-muted text-xs mb-6">{current.artist}</Text>

                {/* Simulated Premium Rolling Lyrics */}
                <Text className="text-text text-xl font-bold leading-relaxed mb-4 text-accent">
                  🎶 Listening on Aruvi Play Premium
                </Text>
                <Text className="text-text text-xl font-bold leading-relaxed mb-4">
                  Enjoying the visual waveform visualizer?
                </Text>
                <Text className="text-text/70 text-xl font-bold leading-relaxed mb-4">
                  This song vibe category matches: {currentContext?.type || "Standard"}
                </Text>
                <Text className="text-text/50 text-xl font-bold leading-relaxed mb-4">
                  Duplicate prevention active for the next 20 songs
                </Text>
                <Text className="text-text/30 text-xl font-bold leading-relaxed mb-4">
                  Share this Music Room session with your friends!
                </Text>
                <Text className="text-text/10 text-xl font-bold leading-relaxed mb-4">
                  Playback continues forever...
                </Text>
              </ScrollView>
            </SafeAreaView>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  artworkContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
});

function SleepTimerHeader({ onTimerPress }: { onTimerPress: () => void }) {
  const timeLeft = useTimerStore((s) => s.timeLeft);
  return (
    <>
      <View className="items-center">
        <Text className="text-text text-[10px] opacity-60 uppercase font-bold tracking-widest">
          Now Playing
        </Text>
        {timeLeft ? (
          <View className="flex-row items-center mt-0.5 px-2 py-0.5 bg-accent/20 rounded-full">
            <Icon name="clock" size={10} color="#1DB954" />
            <Text className="text-accent text-[9px] font-bold ml-1">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable onPress={onTimerPress} hitSlop={12} className="p-2 bg-white/10 rounded-full">
        <Icon name="clock" size={22} color={timeLeft ? "#1DB954" : "#FFFFFF"} />
      </Pressable>
    </>
  );
}
