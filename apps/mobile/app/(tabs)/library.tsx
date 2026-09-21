import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useTheme } from "../../utils/theme";
import { Icon } from "../../components/Icon";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { SongRow } from "../../components/SongRow";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRow } from "../../components/SkeletonRow";
import { SkeletonCard } from "../../components/SkeletonCard";
import { pickLocalSongs } from "../../services/localFiles";
import { dbGetPlaylists, dbSavePlaylist } from "../../services/sqlite";
import { supabase } from "../../services/supabase";
import { getFeaturedPlaylists, searchPlaylists, SaavnPlaylist } from "../../services/saavn";
import { Song } from "../../types/song";

type Tab = "liked" | "playlists" | "local";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface CategoryTab {
  id: string;
  label: string;
  querySuffix?: string;
  icon?: string;
}

const PLAYLIST_CATEGORIES: CategoryTab[] = [
  { id: "all", label: "✨ All", icon: "sparkles" },
  { id: "charts", label: "🔥 Top Charts", querySuffix: "trending", icon: "fire" },
  { id: "artists", label: "⭐ Let's Play", querySuffix: "lets play", icon: "star" },
  { id: "decades", label: "📻 Decades", querySuffix: "1990s 2000s 1980s", icon: "disc" },
  { id: "kuthu", label: "💃 Kuthu & Party", querySuffix: "kuthu dance hits", icon: "music" },
  { id: "melodies", label: "💖 Melodies", querySuffix: "melody hits romance", icon: "heart-filled" },
  { id: "custom", label: "📁 My Custom", icon: "list" },
];

export default function Library() {
  const router = useRouter();
  const theme = useTheme();
  const liked = useLibraryStore((s) => s.liked);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const user = useAuthStore((s) => s.userProfile);
  const languages = useSettingsStore((s) => s.languages);

  const currentSong = usePlayerStore((s) => s.current);
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const bottomPadding = currentSong ? 170 : 120;

  const [tab, setTab] = useState<Tab>("liked");
  const [local, setLocal] = useState<Song[]>([]);
  const [search, setSearch] = useState("");

  // Playlists tab state
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [saavnPlaylists, setSaavnPlaylists] = useState<SaavnPlaylist[]>([]);
  const [loadingSaavn, setLoadingSaavn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customPlaylists, setCustomPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLanguages = languages && languages.length > 0 ? languages : ["tamil"];
  const primaryLang = activeLanguages[0];
  const userId = user?.id || "guest-user";

  // Fetch custom playlists from SQLite and Supabase
  const fetchCustomPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const cached = (await dbGetPlaylists(userId)) || [];
      const combinedMap = new Map<string, any>();

      for (const item of cached) {
        if (item && item.id) {
          combinedMap.set(String(item.id), item);
        }
      }

      const query =
        userId && !userId.startsWith("guest")
          ? supabase
              .from("playlists")
              .select("*")
              .or(`user_id.eq.${userId},is_public.eq.true`)
              .order("created_at", { ascending: false })
          : supabase
              .from("playlists")
              .select("*")
              .eq("is_public", true)
              .order("created_at", { ascending: false });

      const { data: serverPlaylists, error } = await query;

      if (serverPlaylists && !error) {
        for (const item of serverPlaylists) {
          if (item && item.id) {
            combinedMap.set(String(item.id), {
              ...item,
              isPublic: item.is_public,
            });
            await dbSavePlaylist({
              id: item.id,
              userId: item.user_id || userId,
              name: item.name,
              description: item.description,
              coverImage: item.cover_url,
              isPublic: item.is_public,
            });
          }
        }
      }

      const mergedList = Array.from(combinedMap.values());
      setCustomPlaylists(mergedList);
    } catch (e) {
      console.warn("Failed to fetch playlists:", e);
    } finally {
      setLoadingPlaylists(false);
    }
  }, [userId]);

  // Fetch JioSaavn playlists based on category and language
  const fetchSaavnPlaylists = useCallback(
    async (category: string, queryStr = "") => {
      if (category === "custom") return;
      setLoadingSaavn(true);
      try {
        if (queryStr.trim()) {
          const results = await searchPlaylists(`${primaryLang} ${queryStr.trim()}`, 30);
          setSaavnPlaylists(results || []);
          return;
        }

        const cat = PLAYLIST_CATEGORIES.find((c) => c.id === category);
        if (category === "all") {
          const res = await getFeaturedPlaylists(activeLanguages);
          setSaavnPlaylists(res || []);
        } else if (cat?.querySuffix) {
          const res = await searchPlaylists(`${primaryLang} ${cat.querySuffix}`, 24);
          setSaavnPlaylists(res || []);
        }
      } catch (e) {
        console.warn("Failed to fetch JioSaavn playlists for library:", e);
        setSaavnPlaylists([]);
      } finally {
        setLoadingSaavn(false);
      }
    },
    [primaryLang, activeLanguages]
  );

  useFocusEffect(
    useCallback(() => {
      useLibraryStore.getState().hydrate();
      fetchCustomPlaylists();
      if (tab === "playlists") {
        fetchSaavnPlaylists(activeCategory, search);
      }
    }, [fetchCustomPlaylists, fetchSaavnPlaylists, tab, activeCategory, search])
  );

  useEffect(() => {
    if (tab === "playlists") {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(() => {
        fetchSaavnPlaylists(activeCategory, search);
      }, 300);
      return () => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
      };
    }
  }, [tab, activeCategory, search, fetchSaavnPlaylists]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCustomPlaylists(), fetchSaavnPlaylists(activeCategory, search)]);
    setRefreshing(false);
  };

  const filteredData = useMemo(() => {
    const raw = tab === "liked" ? liked : local;
    if (!search.trim()) return raw;
    const q = search.toLowerCase();
    return raw.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
    );
  }, [tab, liked, local, search]);

  const filteredCustomPlaylists = useMemo(() => {
    if (!search.trim()) return customPlaylists;
    const q = search.toLowerCase();
    return customPlaylists.filter((p) => p.name.toLowerCase().includes(q));
  }, [customPlaylists, search]);

  async function importLocal() {
    try {
      const songs = await pickLocalSongs();
      if (songs.length) setLocal((prev) => [...songs, ...prev]);
    } catch (e: any) {
      Alert.alert("Failed to import", String(e?.message ?? e));
    }
  }

  const playAllLiked = (shuffle = false) => {
    if (!liked.length) return;
    const list = shuffle ? [...liked].sort(() => Math.random() - 0.5) : liked;
    playSong(list[0], liked);
  };

  return (
    <AppScreen edges={["top"]}>
      <AppHeader title="Your Library" />

      {/* Tab Selection Row */}
      <View className="px-5 mt-4">
        <View
          className="flex-row p-1 rounded-2xl border"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          {[
            { id: "liked", label: "Liked" },
            { id: "playlists", label: "Playlists" },
            { id: "local", label: "Local" },
          ].map((item) => {
            const isSelected = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setTab(item.id as Tab);
                  setSearch("");
                }}
                className="flex-1 py-2.5 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: isSelected ? theme.elevatedSurface : "transparent",
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: isSelected ? theme.accent : theme.secondaryText }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Library search filter input */}
      <View className="px-5 mt-4">
        <View
          className="flex-row items-center rounded-2xl px-4 py-2.5 border"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <Icon name="search" size={16} color={theme.secondaryText} />
          <TextInput
            className="flex-1 ml-3 text-sm"
            style={{ color: theme.primaryText }}
            placeholder={`Search in ${
              tab === "liked" ? "liked songs" : tab === "playlists" ? "all playlists" : "local files"
            }...`}
            placeholderTextColor={theme.mutedText}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={12} className="p-1">
              <Icon name="close" size={14} color={theme.secondaryText} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tab Contents */}
      {tab === "playlists" ? (
        /* ALL PLAYLISTS TAB VIEW (JIOSAAVN + CUSTOM CATEGORIES) */
        <ScrollView
          className="flex-1 mt-3"
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
        >
          {/* Category Filter Pills */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {PLAYLIST_CATEGORIES.map((cat) => {
                const isSelected = activeCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      setActiveCategory(cat.id);
                    }}
                    className="px-4 py-2 rounded-xl border flex-row items-center active:opacity-80"
                    style={{
                      backgroundColor: isSelected ? theme.accent : theme.card,
                      borderColor: isSelected ? theme.accent : theme.border,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: isSelected ? "#000000" : theme.secondaryText,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Create Custom Playlist Action Button */}
          {(activeCategory === "custom" || activeCategory === "all") && !search && (
            <View className="px-5 mb-4">
              <Pressable
                onPress={() => router.push("/playlists/create" as any)}
                className="flex-row items-center p-3.5 rounded-2xl border active:bg-white/5"
                style={{
                  backgroundColor: `${theme.accent}08`,
                  borderColor: `${theme.accent}15`,
                }}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: theme.elevatedSurface }}
                >
                  <Icon name="plus" size={18} color={theme.accent} />
                </View>
                <Text className="ml-3.5 font-bold text-xs" style={{ color: theme.accent }}>
                  Create New Custom Playlist
                </Text>
              </Pressable>
            </View>
          )}

          {/* User's Custom Playlists (when custom selected or inside all) */}
          {activeCategory === "custom" && (
            <View className="px-5">
              <Text
                className="text-xs font-bold uppercase tracking-wider mb-3"
                style={{ color: theme.secondaryText }}
              >
                My Custom Playlists ({filteredCustomPlaylists.length})
              </Text>

              {loadingPlaylists ? (
                <View className="py-4">
                  <SkeletonRow />
                </View>
              ) : filteredCustomPlaylists.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Icon name="list" size={40} color={theme.mutedText} />
                  <Text className="text-sm font-bold mt-3" style={{ color: theme.primaryText }}>
                    No custom playlists
                  </Text>
                  <Text className="text-xs mt-1 text-center" style={{ color: theme.secondaryText }}>
                    Tap "+ Create New Custom Playlist" above to start.
                  </Text>
                </View>
              ) : (
                filteredCustomPlaylists.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/playlists/${item.id}` as any)}
                    className="flex-row items-center justify-between p-3.5 rounded-2xl mb-2.5 border active:bg-white/5"
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                  >
                    <View className="flex-row items-center flex-1 pr-4">
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center border"
                        style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
                      >
                        <Icon name="music" size={20} color={theme.accent} />
                      </View>
                      <View className="ml-3.5 flex-1 justify-center">
                        <Text
                          className="font-bold text-sm"
                          style={{ color: theme.primaryText }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          className="text-xs mt-0.5"
                          style={{ color: theme.secondaryText }}
                          numberOfLines={1}
                        >
                          {item.song_count || item.songs?.length || 0} songs
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={16} color={theme.mutedText} />
                  </Pressable>
                ))
              )}
            </View>
          )}

          {/* JioSaavn Playlists 2-Column Grid */}
          {activeCategory !== "custom" && (
            <View className="px-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: theme.secondaryText }}
                >
                  {search
                    ? `Playlists Matching "${search}" (${saavnPlaylists.length})`
                    : activeCategory === "all"
                    ? `Featured & Trending Playlists (${primaryLang.toUpperCase()})`
                    : `${PLAYLIST_CATEGORIES.find((c) => c.id === activeCategory)?.label || "Playlists"} (${saavnPlaylists.length})`}
                </Text>

                <Pressable
                  onPress={() => router.push("/playlists" as any)}
                  className="flex-row items-center"
                >
                  <Text className="text-xs font-bold mr-1" style={{ color: theme.accent }}>
                    Full Hub
                  </Text>
                  <Icon name="chevron-right" size={12} color={theme.accent} />
                </Pressable>
              </View>

              {loadingSaavn ? (
                <View className="flex-row flex-wrap justify-between">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <View key={i} style={{ width: CARD_WIDTH }} className="mb-4">
                      <SkeletonCard size={CARD_WIDTH} />
                    </View>
                  ))}
                </View>
              ) : saavnPlaylists.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Icon name="disc" size={40} color={theme.mutedText} />
                  <Text className="text-sm font-bold mt-3" style={{ color: theme.primaryText }}>
                    No playlists found
                  </Text>
                  <Text className="text-xs mt-1 text-center" style={{ color: theme.secondaryText }}>
                    Try searching for another keyword or language.
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap justify-between">
                  {saavnPlaylists.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/playlists/${item.id}?isSaavn=true` as any)}
                      className="mb-4 rounded-2xl overflow-hidden border active:opacity-90"
                      style={{
                        width: CARD_WIDTH,
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <View className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900">
                        <Image
                          source={{
                            uri:
                              item.image ||
                              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
                          }}
                          className="w-full h-full"
                          contentFit="cover"
                          transition={200}
                        />
                        {item.songCount && (
                          <View className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 border border-white/10">
                            <Text className="text-[10px] font-bold text-white">
                              {item.songCount} Tracks
                            </Text>
                          </View>
                        )}
                        {item.language && (
                          <View
                            className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: `${theme.accent}D0` }}
                          >
                            <Text className="text-[9px] font-extrabold text-black uppercase">
                              {item.language}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="p-3">
                        <Text
                          className="font-bold text-xs"
                          style={{ color: theme.primaryText }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          className="text-[11px] mt-0.5"
                          style={{ color: theme.secondaryText }}
                          numberOfLines={1}
                        >
                          {item.subtitle || item.headerDesc || "JioSaavn Playlist"}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : tab === "local" ? (
        /* LOCAL AUDIO FILES VIEW */
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: bottomPadding }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              onPress={importLocal}
              className="mx-5 mb-4 flex-row items-center rounded-2xl p-4 border active:bg-white/5"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <View
                className="w-12 h-12 rounded-xl items-center justify-center border"
                style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
              >
                <Icon name="plus" size={20} color={theme.accent} />
              </View>
              <View className="ml-3.5 flex-1">
                <Text className="font-bold text-sm" style={{ color: theme.primaryText }}>
                  Import Local Audio File
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }}>
                  Select MP3 / WAV from your device storage
                </Text>
              </View>
            </Pressable>
          }
          renderItem={({ item }) => (
            <SongRow
              song={item}
              liked={isLiked(item)}
              onLike={() => toggleLike(item)}
              onAddToQueue={() => addToQueue(item)}
              onPress={() => playSong(item, filteredData)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              iconName="music"
              title="No local songs"
              description="Import local MP3 or audio files from your device to listen offline."
              actionLabel="Import Audio"
              onAction={importLocal}
            />
          }
        />
      ) : (
        /* LIKED SONGS VIEW */
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            liked.length > 0 && !search ? (
              <View className="px-5 pt-4 mb-5">
                <View
                  className="rounded-3xl p-5 border overflow-hidden relative"
                  style={{ backgroundColor: theme.card, borderColor: theme.border }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 pr-3">
                      <View
                        className="w-12 h-12 rounded-2xl items-center justify-center shadow"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Icon name="heart-filled" size={22} color="#000000" />
                      </View>
                      <View className="ml-4 flex-1">
                        <Text className="font-black text-lg" style={{ color: theme.primaryText }}>
                          Liked Songs
                        </Text>
                        <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }}>
                          {liked.length} {liked.length === 1 ? "track" : "tracks"} saved
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => playAllLiked(true)}
                        className="w-10 h-10 rounded-full items-center justify-center border active:opacity-75"
                        style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
                      >
                        <Icon name="shuffle" size={16} color={theme.accent} />
                      </Pressable>
                      <Pressable
                        onPress={() => playAllLiked(false)}
                        className="w-10 h-10 rounded-full items-center justify-center active:opacity-75 shadow"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Icon name="play" size={16} color="#000000" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SongRow
              song={item}
              liked={isLiked(item)}
              onLike={() => toggleLike(item)}
              onAddToQueue={() => addToQueue(item)}
              onPress={() => playSong(item, filteredData)}
            />
          )}
          ListEmptyComponent={
            search ? (
              <EmptyState
                iconName="search"
                title="No songs found"
                description={`No liked songs matched "${search}".`}
              />
            ) : (
              <EmptyState
                iconName="heart"
                title="No liked songs yet"
                description="Songs you like will appear here automatically."
                actionLabel="Explore Music"
                onAction={() => router.push("/(tabs)" as any)}
              />
            )
          }
        />
      )}
    </AppScreen>
  );
}
