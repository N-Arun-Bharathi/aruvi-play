import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useTheme } from "../../utils/theme";
import { useProgress } from "../../hooks/useProgress";
import { Icon } from "../../components/Icon";
import { AppScreen } from "../../components/AppScreen";
import { SectionHeader } from "../../components/SectionHeader";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { SkeletonCard } from "../../components/SkeletonCard";
import { SkeletonRow } from "../../components/SkeletonRow";
import { Song } from "../../types/song";
import { getTrending, searchSongs } from "../../services/saavn";
import { SongOptionsModal } from "../../components/SongOptionsModal";
import { AnimatedHeart } from "../../components/AnimatedHeart";

const MOOD_GENRES = [
  { name: "Tamil Kuthu", subtitle: "High Energy Beats", colors: ["#F97316", "#DC2626"], query: "tamil kuthu hits" },
  { name: "Melody Magic", subtitle: "Soulful & Acoustic", colors: ["#EC4899", "#8B5CF6"], query: "tamil melody hits" },
  { name: "Love & Romance", subtitle: "Heartfelt Hits", colors: ["#E11D48", "#BE123C"], query: "tamil love romantic songs" },
  { name: "90s Nostalgia", subtitle: "Golden Era Classics", colors: ["#D97706", "#B45309"], query: "90s tamil hits" },
  { name: "Late Night Chill", subtitle: "Calm & Relaxing", colors: ["#6366F1", "#3B82F6"], query: "tamil chill melodies" },
  { name: "Gaana & Folk", subtitle: "Street Style Groove", colors: ["#10B981", "#059669"], query: "tamil gaana hits" },
];

const POPULAR_ARTISTS = [
  { name: "A.R. Rahman", img: "https://c.saavncdn.com/artists/A.R._Rahman_002_20210514115148_150x150.jpg", query: "A.R. Rahman" },
  { name: "Anirudh", img: "https://c.saavncdn.com/artists/Anirudh_Ravichander_150x150.jpg", query: "Anirudh Ravichander" },
  { name: "Yuvan", img: "https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_150x150.jpg", query: "Yuvan Shankar Raja" },
  { name: "Harris Jayaraj", img: "https://c.saavncdn.com/artists/Harris_Jayaraj_150x150.jpg", query: "Harris Jayaraj" },
  { name: "Santhosh Narayanan", img: "https://c.saavncdn.com/artists/Santhosh_Narayanan_000_20200811124443_150x150.jpg", query: "Santhosh Narayanan" },
  { name: "Sid Sriram", img: "https://c.saavncdn.com/artists/Sid_Sriram_003_20230224095400_150x150.jpg", query: "Sid Sriram" },
];

const LANGUAGE_PILLS = [
  { id: "all", label: "✨ All" },
  { id: "tamil", label: "🎵 Tamil" },
  { id: "telugu", label: "⚡ Telugu" },
  { id: "malayalam", label: "🌴 Malayalam" },
  { id: "hindi", label: "🔥 Hindi" },
  { id: "english", label: "🎧 English" },
  { id: "kannada", label: "✨ Kannada" },
];

const HeroProgressBar = React.memo(function HeroProgressBar({ songId }: { songId: string }) {
  const currentId = usePlayerStore((s) => s.current?.id);
  const progress = useProgress();
  const theme = useTheme();

  if (currentId !== songId || progress.duration === 0) return null;

  const pct = Math.min(100, Math.max(0, (progress.position / progress.duration) * 100));

  return (
    <View className="w-full bg-white/15 h-1.5 rounded-full mt-3 overflow-hidden">
      <View
        className="h-full rounded-full"
        style={{
          backgroundColor: theme.accent,
          width: `${pct}%`,
        }}
      />
    </View>
  );
});

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  
  const recent = useLibraryStore((s) => s.recent);
  const refreshRecent = useLibraryStore((s) => s.refreshRecent);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playSong = usePlayerStore((s) => s.playSong);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const userProfile = useAuthStore((s) => s.userProfile);
  const isGuest = userProfile?.is_guest ?? false;

  const languages = useSettingsStore((s) => s.languages);
  const setLanguages = useSettingsStore((s) => s.setLanguages);

  const [activeTabLang, setActiveTabLang] = useState<string>("all");
  const [trending, setTrending] = useState<Song[]>([]);
  const [recommended, setRecommended] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOptionsSong, setSelectedOptionsSong] = useState<Song | null>(null);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return { text: "Good morning", icon: "sun" as const };
    if (hrs < 17) return { text: "Good afternoon", icon: "sun" as const };
    if (hrs < 22) return { text: "Good evening", icon: "moon" as const };
    return { text: "Good night", icon: "moon" as const };
  };

  const greeting = getGreeting();

  const loadFeed = useCallback(async () => {
    try {
      refreshRecent();
      const queryLang = activeTabLang === "all" ? languages.join(",") : activeTabLang;
      const [trendSongs, recSongs] = await Promise.all([
        getTrending(queryLang),
        searchSongs(activeTabLang === "all" ? "tamil super hit melodies" : `${activeTabLang} trending top hits`, 10),
      ]);
      setTrending(trendSongs || []);
      setRecommended(recSongs || []);
    } catch (err) {
      console.warn("Feed load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTabLang, languages, refreshRecent]);

  useEffect(() => {
    setLoading(true);
    loadFeed();
  }, [loadFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed();
  }, [loadFeed]);

  const handleSelectLanguageFilter = (langId: string) => {
    setActiveTabLang(langId);
    if (langId !== "all" && !languages.includes(langId)) {
      setLanguages([langId, ...languages.filter((l) => l !== langId)]);
    }
  };

  const handleSearchPrefill = (query: string) => {
    router.push({
      pathname: "/(tabs)/search",
      params: { prefill: query },
    });
  };

  const lastPlayed = current || recent[0] || trending[0];

  const handlePlayHero = async () => {
    if (!lastPlayed) return;
    if (current && lastPlayed.id === current.id) {
      await togglePlay();
    } else {
      const queueList = recent.length > 0 ? recent : trending;
      await playSong(lastPlayed, queueList.length > 0 ? queueList : [lastPlayed]);
    }
  };

  const bottomPadding = current ? 220 : 150;

  return (
    <AppScreen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        {/* ── 1. Header Bar ────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View className="flex-row items-center flex-1 mr-3">
            <View
              className="w-11 h-11 rounded-2xl overflow-hidden items-center justify-center mr-3 border shadow-sm"
              style={{
                backgroundColor: theme.elevatedSurface,
                borderColor: `${theme.accent}40`,
              }}
            >
              <Image
                source={require("../../assets/aruvi-play.png")}
                style={{ width: 44, height: 44 }}
                contentFit="cover"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text
                  className="text-[11px] font-bold uppercase tracking-wider mr-1.5"
                  style={{ color: theme.secondaryText }}
                >
                  {greeting.text}
                </Text>
                <Icon name={greeting.icon} size={12} color={theme.accent} />
              </View>
              <Text
                className="text-xl font-extrabold tracking-tight mt-0.5"
                style={{ color: theme.primaryText }}
                numberOfLines={1}
              >
                {userProfile?.name || "Aruvi Play"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            <Pressable
              onPress={() => router.push("/(tabs)/search")}
              className="w-10 h-10 rounded-2xl border items-center justify-center active:scale-95"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
            >
              <Icon name="search" size={18} color={theme.primaryText} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              className="active:scale-95 transition-transform"
            >
              <ProfileAvatar size={40} />
            </Pressable>
          </View>
        </View>

        {/* ── 2. Filter Pills ──────────────────────────────────────── */}
        <View className="mt-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {LANGUAGE_PILLS.map((pill) => {
              const isSelected = activeTabLang === pill.id;
              return (
                <Pressable
                  key={pill.id}
                  onPress={() => handleSelectLanguageFilter(pill.id)}
                  className="px-4 py-2 rounded-2xl border active:opacity-80"
                  style={{
                    backgroundColor: isSelected ? theme.accent : theme.card,
                    borderColor: isSelected ? theme.accent : theme.border,
                  }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{
                      color: isSelected ? "#000000" : theme.primaryText,
                    }}
                  >
                    {pill.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 3. Shimmer Loading State ───────────────────────────────── */}
        {loading && !refreshing ? (
          <View className="mt-5">
            <View className="px-5 mb-7">
              <View className="h-44 rounded-3xl" style={{ backgroundColor: theme.card }} />
            </View>
            <SectionHeader title="Quick Shortcuts" />
            <View className="px-5 flex-row flex-wrap gap-3 mb-7">
              {[1, 2, 3, 4].map((x) => (
                <View key={x} className="w-[48%] h-14 rounded-2xl" style={{ backgroundColor: theme.card }} />
              ))}
            </View>
            <SectionHeader title="Recently Played" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5 mb-7">
              {[1, 2, 3].map((x) => (
                <SkeletonCard key={x} />
              ))}
            </ScrollView>
            <SectionHeader title="Trending Hits" />
            {[1, 2, 3].map((x) => (
              <SkeletonRow key={x} />
            ))}
          </View>
        ) : (
          <View>
            {/* ── 4. Hero Spotlight Card ───────────────────────────── */}
            {lastPlayed && (
              <View className="px-5 mt-5">
                <Pressable
                  onPress={() => router.push("/player")}
                  onLongPress={() => setSelectedOptionsSong(lastPlayed)}
                  className="rounded-3xl border overflow-hidden relative active:opacity-95 shadow-lg"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: current && current.id === lastPlayed.id ? `${theme.accent}60` : theme.border,
                  }}
                >
                  <LinearGradient
                    colors={
                      current && current.id === lastPlayed.id
                        ? [`${theme.accent}25`, "rgba(18, 18, 23, 0.95)"]
                        : ["rgba(255, 255, 255, 0.05)", "rgba(18, 18, 23, 0.95)"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="p-4 flex-row items-center"
                  >
                    <View className="relative">
                      <Image
                        source={{
                          uri:
                            lastPlayed.artwork ||
                            "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17",
                        }}
                        style={{ width: 84, height: 84, borderRadius: 18 }}
                        className="border border-white/10"
                        contentFit="cover"
                      />
                      {current && current.id === lastPlayed.id && isPlaying && (
                        <View
                          className="absolute top-2 left-2 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                        >
                          <Text className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">
                            LIVE
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-1 ml-4 justify-center pr-14">
                      <Text
                        className="text-[10px] uppercase font-extrabold tracking-widest mb-1"
                        style={{ color: theme.accent }}
                      >
                        {current && current.id === lastPlayed.id
                          ? isPlaying
                            ? "NOW PLAYING"
                            : "PAUSED"
                          : "CONTINUE LISTENING"}
                      </Text>
                      <Text
                        className="text-base font-extrabold leading-tight"
                        numberOfLines={1}
                        style={{ color: theme.primaryText }}
                      >
                        {lastPlayed.title}
                      </Text>
                      <Text
                        className="text-xs font-semibold mt-1"
                        numberOfLines={1}
                        style={{ color: theme.secondaryText }}
                      >
                        {lastPlayed.artist}
                      </Text>

                      <HeroProgressBar songId={lastPlayed.id} />
                    </View>

                    <Pressable
                      onPress={handlePlayHero}
                      className="w-12 h-12 rounded-full items-center justify-center absolute right-4 shadow-xl active:scale-95"
                      style={{
                        backgroundColor: theme.accent,
                        elevation: 8,
                      }}
                    >
                      <Icon
                        name={current && current.id === lastPlayed.id && isPlaying ? "pause" : "play"}
                        size={22}
                        color="#000000"
                      />
                    </Pressable>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* ── 5. Quick Navigation 2x2 Grid ────────────────────── */}
            <View className="px-5 mt-6">
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {[
                  {
                    label: "Liked Songs",
                    icon: "heart-filled",
                    color: "#EF4444",
                    bg: "rgba(239, 68, 68, 0.15)",
                    onPress: () => router.push(isGuest ? "/(tabs)/queue" as any : "/(tabs)/library" as any),
                  },
                  {
                    label: "Playlists",
                    icon: "list",
                    color: "#8B5CF6",
                    bg: "rgba(139, 92, 246, 0.15)",
                    onPress: () => router.push(isGuest ? "/(tabs)/queue" as any : "/(tabs)/library" as any),
                  },
                  {
                    label: "Downloads",
                    icon: "download",
                    color: "#10B981",
                    bg: "rgba(16, 185, 129, 0.15)",
                    onPress: () => router.push(isGuest ? "/(tabs)/queue" as any : "/(tabs)/library" as any),
                  },
                  {
                    label: "Play Queue",
                    icon: "queue",
                    color: "#F59E0B",
                    bg: "rgba(245, 158, 11, 0.15)",
                    onPress: () => router.push("/(tabs)/queue" as any),
                  },
                ].map((item, idx) => (
                  <Pressable
                    key={idx}
                    onPress={item.onPress}
                    className="w-[48.5%] py-3 px-3.5 rounded-2xl border flex-row items-center active:scale-98 transition-transform"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    }}
                  >
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center mr-2.5"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Icon name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <Text
                      className="text-xs font-bold flex-1"
                      style={{ color: theme.primaryText }}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── 6. Recently Played Carousel ─────────────────────── */}
            {!isGuest && recent.length > 0 && (
              <View className="mt-7">
                <SectionHeader
                  title="Recently Played"
                  onSeeAll={() => router.push("/(tabs)/library" as any)}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                  className="mt-2.5"
                >
                  {recent.slice(0, 10).map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        playSong(s, recent);
                        router.push("/player");
                      }}
                      onLongPress={() => setSelectedOptionsSong(s)}
                      className="w-32 active:scale-95 transition-transform"
                    >
                      <View className="relative">
                        <Image
                          source={{
                            uri: s.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17",
                          }}
                          style={{ width: 128, height: 128, borderRadius: 20 }}
                          className="border border-white/10 shadow-sm"
                          contentFit="cover"
                        />
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center absolute right-2.5 bottom-2.5 shadow-md"
                          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
                        >
                          <Icon name="play" size={14} color="#FFFFFF" />
                        </View>
                      </View>
                      <Text
                        className="text-xs font-bold mt-2.5 text-left"
                        numberOfLines={1}
                        style={{ color: theme.primaryText }}
                      >
                        {s.title}
                      </Text>
                      <Text
                        className="text-[11px] font-medium mt-0.5 text-left"
                        numberOfLines={1}
                        style={{ color: theme.secondaryText }}
                      >
                        {s.artist}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── 7. Trending Top Hits (Numbered Cards) ────────────── */}
            {trending.length > 0 && (
              <View className="mt-7">
                <SectionHeader
                  title="Trending Hits"
                  onSeeAll={() => handleSearchPrefill(activeTabLang === "all" ? "tamil trending top hits" : `${activeTabLang} trending`)}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                  className="mt-2.5"
                >
                  {trending.slice(0, 10).map((s, idx) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        playSong(s, trending);
                        router.push("/player");
                      }}
                      onLongPress={() => setSelectedOptionsSong(s)}
                      className="w-36 active:scale-95 transition-transform"
                    >
                      <View className="relative">
                        <Image
                          source={{
                            uri: s.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17",
                          }}
                          style={{ width: 144, height: 144, borderRadius: 22 }}
                          className="border border-white/10 shadow-md"
                          contentFit="cover"
                        />
                        <View
                          className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg border shadow-sm"
                          style={{
                            backgroundColor: "rgba(0,0,0,0.75)",
                            borderColor: "rgba(255,255,255,0.15)",
                          }}
                        >
                          <Text className="text-[10px] font-black text-amber-400">
                            #{idx + 1}
                          </Text>
                        </View>
                        <View
                          className="w-9 h-9 rounded-full items-center justify-center absolute right-2.5 bottom-2.5 shadow-md"
                          style={{ backgroundColor: theme.accent }}
                        >
                          <Icon name="play" size={16} color="#000000" />
                        </View>
                      </View>
                      <Text
                        className="text-sm font-bold mt-2.5 text-left"
                        numberOfLines={1}
                        style={{ color: theme.primaryText }}
                      >
                        {s.title}
                      </Text>
                      <Text
                        className="text-xs font-medium mt-0.5 text-left"
                        numberOfLines={1}
                        style={{ color: theme.secondaryText }}
                      >
                        {s.artist}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── 8. Moods & Genres (Gradient Cards) ───────────────── */}
            <View className="mt-7">
              <SectionHeader title="Moods & Genres" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                className="mt-2.5"
              >
                {MOOD_GENRES.map((g, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleSearchPrefill(g.query)}
                    className="w-44 h-24 rounded-3xl overflow-hidden border active:scale-95 transition-transform"
                    style={{ borderColor: theme.border }}
                  >
                    <LinearGradient
                      colors={g.colors as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="flex-1 p-3.5 justify-between"
                    >
                      <Text className="text-base font-extrabold text-white tracking-tight">
                        {g.name}
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                          {g.subtitle}
                        </Text>
                        <View className="w-6 h-6 rounded-full bg-white/20 items-center justify-center">
                          <Icon name="chevron-right" size={12} color="#FFFFFF" />
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ── 9. Recommended Songs List ────────────────────────── */}
            {recommended.length > 0 && (
              <View className="mt-7">
                <SectionHeader
                  title="Recommended for You"
                  onSeeAll={() => handleSearchPrefill("tamil super hit songs")}
                />
                <View className="mt-2.5 px-5 gap-2.5">
                  {recommended.slice(0, 6).map((s, idx) => {
                    const likedState = !isGuest && isLiked(s);
                    const isSongActive = current?.id === s.id;

                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          playSong(s, recommended);
                          router.push("/player");
                        }}
                        onLongPress={() => setSelectedOptionsSong(s)}
                        className="flex-row items-center p-3 rounded-2xl border active:bg-white/5 transition-all"
                        style={{
                          backgroundColor: isSongActive ? `${theme.accent}12` : theme.card,
                          borderColor: isSongActive ? `${theme.accent}50` : theme.border,
                        }}
                      >
                        <Text
                          className="w-6 text-center text-xs font-black mr-2"
                          style={{ color: isSongActive ? theme.accent : theme.mutedText }}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </Text>

                        <Image
                          source={{ uri: s.artwork }}
                          style={{ width: 48, height: 48, borderRadius: 14 }}
                          className="border border-white/10"
                          contentFit="cover"
                        />

                        <View className="flex-1 ml-3 pr-2">
                          <Text
                            className="text-sm font-bold"
                            style={{ color: isSongActive ? theme.accent : theme.primaryText }}
                            numberOfLines={1}
                          >
                            {s.title}
                          </Text>
                          <Text
                            className="text-xs font-medium mt-0.5"
                            style={{ color: theme.secondaryText }}
                            numberOfLines={1}
                          >
                            {s.artist}
                          </Text>
                        </View>

                        <View className="flex-row items-center space-x-1">
                          {!isGuest && (
                            <AnimatedHeart
                              liked={likedState}
                              onPress={async () => {
                                await toggleLike(s);
                              }}
                              size={18}
                              activeColor="#EF4444"
                              inactiveColor={theme.secondaryText}
                            />
                          )}

                          <Pressable
                            hitSlop={8}
                            onPress={() => setSelectedOptionsSong(s)}
                            className="p-2"
                          >
                            <Icon name="more" size={16} color={theme.secondaryText} />
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── 10. Popular Artists Carousel ──────────────────────── */}
            <View className="mt-7">
              <SectionHeader title="Popular Artists" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
                className="mt-2.5"
              >
                {POPULAR_ARTISTS.map((artist) => (
                  <Pressable
                    key={artist.name}
                    onPress={() => handleSearchPrefill(artist.query)}
                    className="items-center active:scale-95 transition-transform"
                  >
                    <View
                      className="w-20 h-20 rounded-full overflow-hidden border-2 shadow-md"
                      style={{ borderColor: `${theme.accent}30` }}
                    >
                      <Image
                        source={{ uri: artist.img }}
                        style={{ width: 80, height: 80, borderRadius: 40 }}
                        contentFit="cover"
                      />
                    </View>
                    <Text
                      className="text-xs font-bold mt-2 text-center w-20"
                      numberOfLines={1}
                      style={{ color: theme.primaryText }}
                    >
                      {artist.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── 11. Song Options Bottom Sheet ─────────────────────────── */}
      <SongOptionsModal
        song={selectedOptionsSong}
        visible={!!selectedOptionsSong}
        onClose={() => setSelectedOptionsSong(null)}
      />
    </AppScreen>
  );
}
