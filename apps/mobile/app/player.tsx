import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { usePlayerStore } from "../store/playerStore";
import { useLibraryStore } from "../store/likedStore";
import { Icon } from "../components/Icon";
import { AnimatedHeart } from "../components/AnimatedHeart";
import { useTimerStore } from "../store/timerStore";
import { tryGetPlayer } from "../services/trackPlayer";
import { useTheme } from "../utils/theme";
import { useToastStore } from "../store/toastStore";
import { useAuthStore } from "../store/authStore";
import { useProgress } from "../hooks/useProgress";
import { formatTime } from "../utils/format";
import { dbGetPlaylists, dbAddSongToPlaylist, dbGetPlaylistSongs } from "../services/sqlite";
import { supabase } from "../services/supabase";
import { getSongLyrics, LyricsData, LyricLine } from "../services/saavn";
import { SongOptionsModal } from "../components/SongOptionsModal";

const { width, height } = Dimensions.get("window");

export default function PlayerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const toast = useToastStore();

  const current = usePlayerStore((s) => s.current);
  const queue = usePlayerStore((s) => s.queue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const currentContext = usePlayerStore((s) => s.currentContext);

  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const setTimer = useTimerStore((s) => s.setTimer);
  const timeLeft = useTimerStore((s) => s.timeLeft);
  const user = useAuthStore((s) => s.userProfile);

  // Progress tracking
  const { position, duration } = useProgress();
  const [scrubbingPos, setScrubbingPos] = useState<number | null>(null);

  // Volume state
  const [volume, setVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Modals & lyrics
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const lyricsListRef = useRef<FlatList<LyricLine>>(null);
  const isUserTouchingLyricsRef = useRef(false);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Artwork Animation: Scales smoothly when playing vs paused
  const artworkScale = useSharedValue(1.0);

  useEffect(() => {
    artworkScale.value = withSpring(isPlaying ? 1.0 : 0.90, {
      damping: 16,
      stiffness: 120,
    });
  }, [isPlaying]);

  const animatedArtworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artworkScale.value }],
  }));

  // Initialize and update volume
  useEffect(() => {
    const player = tryGetPlayer();
    if (player) {
      setVolume(player.volume ?? 1.0);
    }
  }, [current]);

  const onVolumeChange = (val: number) => {
    setVolume(val);
    const player = tryGetPlayer();
    if (player) {
      player.setVolume(val);
    }
    usePlayerStore.getState().setVolume(val).catch(() => {});
  };

  // Fetch lyrics when song changes or lyrics modal opened
  const fetchLyrics = useCallback(async () => {
    if (!current) return;
    setLoadingLyrics(true);
    setLyricsData(null);
    try {
      const data = await getSongLyrics(current.id, current.title, current.artist);
      setLyricsData(data);
    } catch (e) {
      console.warn("fetchLyrics error:", e);
      setLyricsData(null);
    } finally {
      setLoadingLyrics(false);
    }
  }, [current?.id, current?.title, current?.artist]);

  useEffect(() => {
    if (showLyrics && current) {
      fetchLyrics();
    }
  }, [showLyrics, current?.id, fetchLyrics]);

  // Real-time active lyric line computation
  const activeLyricIndex = useMemo(() => {
    if (!lyricsData?.lines?.length || !lyricsData.synced) return -1;
    const curPos = scrubbingPos ?? position;
    let idx = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      if (curPos >= lyricsData.lines[i].time - 0.25) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyricsData, position, scrubbingPos]);

  // Auto-scroll to active lyric line smoothly
  useEffect(() => {
    if (!showLyrics || activeLyricIndex < 0 || isUserTouchingLyricsRef.current) return;
    try {
      lyricsListRef.current?.scrollToIndex({
        index: activeLyricIndex,
        animated: true,
        viewPosition: 0.35,
      });
    } catch (e) {}
  }, [activeLyricIndex, showLyrics]);



  const handleOpenPlaylistModal = async () => {
    setShowPlaylistModal(true);
    try {
      const userId = user?.id || "guest-user";
      const cached = (await dbGetPlaylists(userId)) || [];
      const combinedMap = new Map<string, any>();

      for (const p of cached) {
        if (p && p.id) combinedMap.set(String(p.id), p);
      }

      const query = userId && !userId.startsWith("guest")
        ? supabase.from("playlists").select("*").or(`user_id.eq.${userId},is_public.eq.true`).order("created_at", { ascending: false })
        : supabase.from("playlists").select("*").eq("is_public", true).order("created_at", { ascending: false });

      const { data: serverPlaylists } = await query;
      if (serverPlaylists) {
        for (const p of serverPlaylists) {
          if (p && p.id) combinedMap.set(String(p.id), p);
        }
      }

      setUserPlaylists(Array.from(combinedMap.values()));
    } catch (e) {
      console.warn("Failed to load playlists:", e);
    }
  };

  const handleAddCurrentToPlaylist = async (playlist: any) => {
    if (!current) return;
    try {
      const existing = await dbGetPlaylistSongs(playlist.id);
      const pos = existing.length + 1;

      await dbAddSongToPlaylist(playlist.id, current, pos);

      try {
        await supabase.from("songs").upsert({
          id: current.id,
          title: current.title,
          normalized_title: current.title.toLowerCase(),
          artist: current.artist,
          album: current.album || "",
          artwork_url: current.artwork || "",
          source_type: current.source || "online",
          source_url: current.url || "",
          duration_seconds: current.duration || 0,
        }, { onConflict: "id" });

        await supabase.from("playlist_songs").insert({
          playlist_id: playlist.id,
          song_id: current.id,
          position: pos,
        });
      } catch (_) {}

      setShowPlaylistModal(false);
      toast.show(`Added "${current.title}" to ${playlist.name}!`);
    } catch (e) {
      toast.show("Failed to add song to playlist.");
    }
  };

  const showTimerOptions = () => {
    Alert.alert(
      "Sleep Timer",
      timeLeft ? `Active: ${Math.ceil(timeLeft / 60)} mins remaining` : "Automatically stop audio playback after:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "15 Minutes", onPress: () => setTimer(15) },
        { text: "30 Minutes", onPress: () => setTimer(30) },
        { text: "45 Minutes", onPress: () => setTimer(45) },
        { text: "60 Minutes", onPress: () => setTimer(60) },
        { text: "Turn Off Timer", onPress: () => setTimer(null), style: "destructive" },
      ],
      { cancelable: true }
    );
  };

  if (!current) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <Text className="text-sm font-semibold" style={{ color: theme.secondaryText }}>No track playing</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 px-5 py-2.5 rounded-full border"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <Text className="text-xs font-bold" style={{ color: theme.primaryText }}>Back to Home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const liked = isLiked(current);
  const currentPos = scrubbingPos ?? position;
  const maxPos = duration > 0 ? duration : 1;
  const artDimension = Math.min(width - 56, height * 0.36);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* ── Background Ambient Backdrop ──────────────────────────── */}
      {current.artwork ? (
        <Image
          source={{ uri: current.artwork }}
          style={StyleSheet.absoluteFill}
          className="opacity-35"
          blurRadius={60}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface }]} />
      )}

      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.85)", "rgba(0,0,0,0.98)"]}
        style={StyleSheet.absoluteFill}
      />
      <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />

      <SafeAreaView className="flex-1 justify-between px-6 pb-2" edges={["top", "bottom"]}>
        {/* ── Top Header Navigation Bar ────────────────────────────── */}
        <View className="flex-row items-center justify-between pt-1">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="w-10 h-10 rounded-full border items-center justify-center active:scale-90"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }}
          >
            <Icon name="chevron-down" size={22} color="#FFFFFF" />
          </Pressable>

          <View className="items-center px-4 flex-1">
            <View className="flex-row items-center space-x-1.5">
              <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
              <Text className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                {currentContext?.title || "Aruvi Play"}
              </Text>
            </View>
            <Text className="text-xs font-semibold text-white/70 mt-0.5" numberOfLines={1}>
              {current.album || "Now Playing"}
            </Text>
          </View>

          <View className="flex-row items-center space-x-2">
            <Pressable
              onPress={showTimerOptions}
              hitSlop={10}
              className="w-10 h-10 rounded-full border items-center justify-center active:scale-90"
              style={{
                backgroundColor: timeLeft ? `${theme.accent}30` : "rgba(255,255,255,0.08)",
                borderColor: timeLeft ? theme.accent : "rgba(255,255,255,0.12)",
              }}
            >
              <Icon name="clock" size={18} color={timeLeft ? theme.accent : "#FFFFFF"} />
            </Pressable>

            <Pressable
              onPress={() => setShowOptionsMenu(true)}
              hitSlop={10}
              className="w-10 h-10 rounded-full border items-center justify-center active:scale-90"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }}
            >
              <Icon name="more" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* ── Center Artwork ──────────────────────────────────────── */}
        <View className="items-center justify-center my-auto">
          <Animated.View
            style={[
              { width: artDimension, height: artDimension },
              styles.artworkCard,
              animatedArtworkStyle,
            ]}
            className="rounded-[32px] overflow-hidden border border-white/20 shadow-2xl relative"
          >
            {current.artwork ? (
              <Image
                source={{ uri: current.artwork }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-zinc-900">
                <Icon name="music" size={72} color="#71717A" />
              </View>
            )}
          </Animated.View>
        </View>

        {/* ── Track Info & Heart Favorite ──────────────────────────── */}
        <View className="flex-row items-center justify-between mt-2 mb-3">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-black tracking-tight text-white" numberOfLines={1}>
              {current.title}
            </Text>
            <Text className="text-sm font-semibold text-zinc-400 mt-1" numberOfLines={1}>
              {current.artist}
            </Text>
          </View>

          <AnimatedHeart
            liked={liked}
            onPress={() => toggleLike(current)}
            size={30}
            activeColor="#EF4444"
            inactiveColor="#A1A1AA"
          />
        </View>

        {/* ── Progress Seek Bar ────────────────────────────────────── */}
        <View className="mb-2">
          <Slider
            style={{ width: "100%", height: 32 }}
            minimumValue={0}
            maximumValue={maxPos}
            value={currentPos}
            minimumTrackTintColor={theme.accent}
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#FFFFFF"
            onSlidingStart={(v) => setScrubbingPos(v)}
            onValueChange={(v) => setScrubbingPos(v)}
            onSlidingComplete={async (v) => {
              try {
                setScrubbingPos(v);
                await seekTo(v);
              } catch (e) {
                console.warn("Seek error:", e);
              } finally {
                setTimeout(() => {
                  setScrubbingPos(null);
                }, 150);
              }
            }}
          />
          <View className="flex-row justify-between px-1 -mt-1">
            <Text className="text-xs font-bold text-zinc-400">{formatTime(currentPos)}</Text>
            <Text className="text-xs font-bold text-zinc-400">{formatTime(duration)}</Text>
          </View>
        </View>

        {/* ── Main Transport Controls ──────────────────────────────── */}
        <View className="flex-row items-center justify-between px-2 mb-4">
          <Pressable
            onPress={toggleShuffle}
            hitSlop={12}
            className="p-3 active:scale-90 relative"
          >
            <Icon
              name="shuffle"
              size={22}
              color={shuffle ? theme.accent : "#A1A1AA"}
            />
            {shuffle && (
              <View
                className="w-1.5 h-1.5 rounded-full absolute bottom-1.5 self-center"
                style={{ backgroundColor: theme.accent }}
              />
            )}
          </Pressable>

          <Pressable
            onPress={prev}
            hitSlop={12}
            className="p-3 active:scale-90"
          >
            <Icon name="prev" size={34} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={togglePlay}
            hitSlop={8}
            className="w-18 h-18 rounded-full items-center justify-center shadow-2xl active:scale-95"
            style={[styles.heroPlayButton, { backgroundColor: theme.accent }]}
          >
            <Icon
              name={isPlaying ? "pause" : "play"}
              size={32}
              color="#000000"
            />
          </Pressable>

          <Pressable
            onPress={next}
            hitSlop={12}
            className="p-3 active:scale-90"
          >
            <Icon name="next" size={34} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={cycleRepeat}
            hitSlop={12}
            className="p-3 active:scale-90 relative"
          >
            <Icon
              name={repeat === "one" ? "repeat-one" : "repeat"}
              size={22}
              color={repeat === "off" ? "#A1A1AA" : theme.accent}
            />
            {repeat !== "off" && (
              <View
                className="w-1.5 h-1.5 rounded-full absolute bottom-1.5 self-center"
                style={{ backgroundColor: theme.accent }}
              />
            )}
          </Pressable>
        </View>

        {/* ── Volume Slider (Apple Music / Spotify Style) ──────────── */}
        <View className="flex-row items-center px-1 mb-2.5">
          <Pressable
            onPress={() => onVolumeChange(volume > 0 ? 0 : 0.7)}
            hitSlop={8}
            className="p-1.5 active:scale-90"
          >
            <Icon
              name={volume === 0 ? "volume-off" : volume < 0.5 ? "volume-low" : "volume-high"}
              size={15}
              color={volume === 0 ? "#71717A" : theme.accent}
            />
          </Pressable>

          <Slider
            style={{ flex: 1, height: 26, marginHorizontal: 6 }}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={onVolumeChange}
            minimumTrackTintColor="rgba(255,255,255,0.7)"
            maximumTrackTintColor="rgba(255,255,255,0.15)"
            thumbTintColor="#FFFFFF"
          />

          <Pressable
            onPress={() => onVolumeChange(1.0)}
            hitSlop={8}
            className="p-1.5 active:scale-90"
          >
            <Icon name="volume-high" size={15} color="#A1A1AA" />
          </Pressable>
        </View>

        {/* ── Bottom Action Utility Row (Spotify / Apple Music Style) ─ */}
        <View className="flex-row items-center justify-between px-1 py-1">
          {/* Left: Lyrics Button */}
          <Pressable
            onPress={() => setShowLyrics(true)}
            className="flex-row items-center px-4 py-2.5 rounded-full border active:scale-95 shadow-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Icon name="lyrics" size={15} color={theme.accent} />
            <Text className="text-xs font-bold text-white ml-2">Lyrics</Text>
          </Pressable>

          {/* Right: Queue Button */}
          <Pressable
            onPress={() => router.push("/queue")}
            hitSlop={10}
            className="flex-row items-center px-4 py-2.5 rounded-full border active:scale-95 shadow-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Icon name="list" size={15} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white ml-2">Queue</Text>
            {queue.length > 0 && (
              <View
                className="ml-2 px-2 py-0.5 rounded-full items-center justify-center"
                style={{ backgroundColor: `${theme.accent}35` }}
              >
                <Text className="text-[10px] font-black" style={{ color: theme.accent }}>
                  {queue.length}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ── Slide-up Lyrics Sheet Modal ──────────────────────────── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showLyrics}
        onRequestClose={() => setShowLyrics(false)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <BlurView intensity={95} tint="dark" className="h-[85%] rounded-t-[36px] overflow-hidden border-t border-white/15">
            <SafeAreaView className="flex-1" edges={["bottom"]}>
              <View className="flex-row justify-between items-center px-6 py-4 border-b border-white/10">
                <View className="flex-row items-center">
                  <Icon name="lyrics" size={20} color={theme.accent} />
                  <Text className="text-lg font-black text-white ml-2">Song Lyrics</Text>
                  {lyricsData?.synced ? (
                    <View className="flex-row items-center px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 ml-2.5">
                      <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
                      <Text className="text-[10px] font-black text-emerald-400">SYNCED</Text>
                    </View>
                  ) : lyricsData?.lines ? (
                    <View className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 ml-2.5">
                      <Text className="text-[10px] font-bold text-zinc-400">TEXT</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setShowLyrics(false)}
                  className="px-4 py-1.5 bg-white/10 rounded-full border border-white/10 active:bg-white/20"
                >
                  <Text className="text-xs font-bold text-white">Done</Text>
                </Pressable>
              </View>

              <View className="px-6 pt-3 pb-1">
                <Text className="text-lg font-black text-emerald-400" numberOfLines={1}>
                  {current.title}
                </Text>
                <Text className="text-xs font-semibold text-zinc-400" numberOfLines={1}>
                  {current.artist}
                </Text>
              </View>

              {loadingLyrics ? (
                <View className="flex-1 items-center justify-center py-20">
                  <ActivityIndicator size="large" color={theme.accent} />
                  <Text className="text-xs font-semibold text-zinc-400 mt-3">Fetching synchronized lyrics...</Text>
                </View>
              ) : lyricsData && lyricsData.lines.length > 0 ? (
                <FlatList
                  ref={lyricsListRef}
                  data={lyricsData.lines}
                  keyExtractor={(item, index) => `${index}-${item.time}`}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 80 }}
                  showsVerticalScrollIndicator={false}
                  onScrollBeginDrag={() => {
                    isUserTouchingLyricsRef.current = true;
                    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
                  }}
                  onScrollEndDrag={() => {
                    touchTimeoutRef.current = setTimeout(() => {
                      isUserTouchingLyricsRef.current = false;
                    }, 3500);
                  }}
                  onMomentumScrollEnd={() => {
                    touchTimeoutRef.current = setTimeout(() => {
                      isUserTouchingLyricsRef.current = false;
                    }, 3500);
                  }}
                  onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                      try {
                        lyricsListRef.current?.scrollToIndex({
                          index: info.index,
                          animated: true,
                          viewPosition: 0.35,
                        });
                      } catch (e) {}
                    }, 100);
                  }}
                  renderItem={({ item, index }) => {
                    const isActive = index === activeLyricIndex;
                    const isPast = activeLyricIndex > -1 && index < activeLyricIndex;
                    const isFuture = activeLyricIndex > -1 && index > activeLyricIndex;

                    return (
                      <Pressable
                        onPress={() => {
                          if (lyricsData.synced) {
                            seekTo(item.time);
                          }
                        }}
                        className={`py-3 px-3.5 rounded-2xl my-1 flex-row items-center active:bg-white/15 ${
                          isActive
                            ? "bg-white/15 border border-white/20 shadow-md shadow-emerald-500/20"
                            : ""
                        }`}
                      >
                        {isActive && (
                          <View
                            className="w-1.5 h-6 rounded-full mr-3"
                            style={{ backgroundColor: theme.accent }}
                          />
                        )}
                        <Text
                          className={`flex-1 leading-relaxed ${
                            isActive
                              ? "text-xl font-black text-white scale-105"
                              : isPast
                              ? "text-base font-semibold text-zinc-400 opacity-60"
                              : isFuture
                              ? "text-base font-semibold text-zinc-500 opacity-40"
                              : "text-base font-semibold text-zinc-200"
                          }`}
                          style={isActive ? { color: "#FFFFFF" } : undefined}
                        >
                          {item.text}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              ) : (
                <View className="flex-1 items-center justify-center px-8">
                  <Icon name="music" size={40} color="#71717A" />
                  <Text className="text-sm font-bold text-white mt-3">No lyrics found for this track</Text>
                  <Text className="text-xs text-zinc-400 mt-1 text-center max-w-xs">
                    Lyrics are provided automatically when available from our lyrics providers.
                  </Text>
                  <Pressable
                    onPress={fetchLyrics}
                    className="mt-5 px-5 py-2.5 rounded-full border active:bg-white/10"
                    style={{ borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.06)" }}
                  >
                    <Text className="text-xs font-bold text-white">Retry Fetching Lyrics</Text>
                  </Pressable>
                </View>
              )}
            </SafeAreaView>
          </BlurView>
        </View>
      </Modal>

      {/* ── Add to Playlist Bottom Sheet Modal ───────────────────── */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPlaylistModal}
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <Pressable onPress={() => setShowPlaylistModal(false)} className="flex-1 justify-end bg-black/70">
          <Pressable
            className="p-6 rounded-t-[36px] border-t overflow-hidden"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <View className="w-12 h-1.5 rounded-full bg-white/20 self-center mb-4" />
            <Text className="text-xl font-extrabold" style={{ color: theme.primaryText }}>Add to Playlist</Text>
            <Text className="text-xs mt-0.5 mb-4" style={{ color: theme.secondaryText }}>
              Select a playlist for &quot;{current.title}&quot;
            </Text>

            <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
              {userPlaylists.map((pl) => (
                <Pressable
                  key={pl.id}
                  onPress={() => handleAddCurrentToPlaylist(pl)}
                  className="p-4 rounded-2xl border mb-2.5 flex-row items-center justify-between active:bg-white/5"
                  style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>{pl.name}</Text>
                    <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }}>
                      {pl.description || "Custom Playlist"}
                    </Text>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-emerald-500/20 items-center justify-center">
                    <Icon name="plus" size={16} color={theme.accent} />
                  </View>
                </Pressable>
              ))}

              {userPlaylists.length === 0 && (
                <Text className="text-xs text-center py-8" style={{ color: theme.secondaryText }}>
                  No playlists yet. Create one in your Library tab!
                </Text>
              )}
            </ScrollView>

            <Pressable
              onPress={() => setShowPlaylistModal(false)}
              className="mt-4 py-3.5 rounded-2xl border items-center"
              style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
            >
              <Text className="text-xs font-bold" style={{ color: theme.primaryText }}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 3-Dot Options Bottom Sheet ───────────────────────────── */}
      <SongOptionsModal
        song={current}
        visible={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artworkCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 25,
  },
  heroPlayButton: {
    width: 68,
    height: 68,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
});
