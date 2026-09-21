import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  FlatList,
  Dimensions,
  TextInput,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { Icon } from "../../components/Icon";
import { SkeletonCard } from "../../components/SkeletonCard";
import { useTheme } from "../../utils/theme";
import { useSettingsStore } from "../../store/settingsStore";
import { usePlayerStore } from "../../store/playerStore";
import { useAuthStore } from "../../store/authStore";
import {
  getFeaturedPlaylists,
  searchPlaylists,
  SaavnPlaylist,
} from "../../services/saavn";
import { dbGetPlaylists } from "../../services/sqlite";
import { supabase } from "../../services/supabase";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface CategoryTab {
  id: string;
  label: string;
  querySuffix?: string;
  icon?: string;
}

const CATEGORIES: CategoryTab[] = [
  { id: "all", label: "✨ All", icon: "sparkles" },
  { id: "charts", label: "🔥 Top Charts", querySuffix: "trending", icon: "fire" },
  { id: "artists", label: "⭐ Let's Play", querySuffix: "lets play", icon: "star" },
  { id: "decades", label: "📻 Decades", querySuffix: "1990s 2000s 1980s", icon: "disc" },
  { id: "kuthu", label: "💃 Kuthu & Party", querySuffix: "kuthu dance hits", icon: "music" },
  { id: "melodies", label: "💖 Melodies", querySuffix: "melody hits romance", icon: "heart-filled" },
  { id: "my_playlists", label: "📁 My Playlists", icon: "list" },
];

export default function PlaylistsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const languages = useSettingsStore((s) => s.languages);
  const user = useAuthStore((s) => s.userProfile);
  const isGuest = user?.is_guest ?? false;
  const currentSong = usePlayerStore((s) => s.current);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [featuredPlaylists, setFeaturedPlaylists] = useState<SaavnPlaylist[]>([]);
  const [artistPlaylists, setArtistPlaylists] = useState<SaavnPlaylist[]>([]);
  const [decadePlaylists, setDecadePlaylists] = useState<SaavnPlaylist[]>([]);
  const [moodPlaylists, setMoodPlaylists] = useState<SaavnPlaylist[]>([]);
  const [categoryPlaylists, setCategoryPlaylists] = useState<SaavnPlaylist[]>([]);
  const [searchResults, setSearchResults] = useState<SaavnPlaylist[]>([]);
  const [searching, setSearching] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLanguages = languages && languages.length > 0 ? languages : ["tamil"];
  const primaryLang = activeLanguages[0];

  const loadMyPlaylists = useCallback(async () => {
    if (isGuest) return;
    try {
      const userId = user?.id || "guest-user";
      const cached = (await dbGetPlaylists(userId)) || [];
      const { data: serverPls } = await supabase
        .from("playlists")
        .select("*")
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .order("created_at", { ascending: false });

      const map = new Map<string, any>();
      for (const item of cached) {
        if (item?.id) map.set(String(item.id), item);
      }
      if (serverPls) {
        for (const item of serverPls) {
          if (item?.id) map.set(String(item.id), item);
        }
      }
      setMyPlaylists(Array.from(map.values()));
    } catch (e) {
      console.warn("My playlists load error:", e);
    }
  }, [isGuest, user?.id]);

  const loadFeed = useCallback(async () => {
    try {
      const [feat, art, dec, mood] = await Promise.all([
        getFeaturedPlaylists(activeLanguages),
        searchPlaylists(`${primaryLang} lets play`, 12),
        searchPlaylists(`${primaryLang} 1990s 2000s 1980s`, 12),
        searchPlaylists(`${primaryLang} kuthu melody`, 12),
      ]);

      setFeaturedPlaylists(feat || []);
      setArtistPlaylists(art || []);
      setDecadePlaylists(dec || []);
      setMoodPlaylists(mood || []);
      await loadMyPlaylists();
    } catch (err) {
      console.warn("Playlists feed error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLanguages, primaryLang, loadMyPlaylists]);

  useEffect(() => {
    setLoading(true);
    loadFeed();
  }, [loadFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed();
  }, [loadFeed]);

  // Handle Category Switching
  const handleSelectCategory = async (catId: string) => {
    setActiveCategory(catId);
    if (catId === "all" || catId === "my_playlists") {
      setCategoryPlaylists([]);
      return;
    }

    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat?.querySuffix) return;

    setLoading(true);
    try {
      const results = await searchPlaylists(`${primaryLang} ${cat.querySuffix}`, 24);
      setCategoryPlaylists(results || []);
    } catch (e) {
      console.warn("Category load error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Search Debounce Handler
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (!text.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const results = await searchPlaylists(text.trim(), 24);
        setSearchResults(results || []);
      } catch (err) {
        console.error("Search playlists error:", err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleOpenPlaylist = (pl: {
    id: string;
    title: string;
    image?: string;
    subtitle?: string;
    isSaavn?: boolean;
  }) => {
    router.push({
      pathname: "/playlists/[id]",
      params: {
        id: pl.id,
        isSaavn: pl.isSaavn !== false ? "true" : "false",
        name: pl.title,
        coverUrl: pl.image || "",
        subtitle: pl.subtitle || "",
      },
    });
  };

  const bottomPadding = currentSong ? 180 : 120;

  return (
    <AppScreen edges={["top"]}>
      <AppHeader
        title="Playlists"
        subtitle={`${activeLanguages.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(", ")} Catalog`}
        showBack
        rightActions={
          !isGuest ? (
            <Pressable
              onPress={() => router.push("/playlists/create")}
              className="p-2 bg-accent/20 rounded-full active:bg-accent/30 flex-row items-center px-3 py-1.5"
            >
              <Icon name="plus" size={14} color={theme.accent} />
              <Text className="text-xs font-bold ml-1.5" style={{ color: theme.accent }}>
                Create
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* ── Search Bar ──────────────────────────────────────────────── */}
      <View className="px-5 pt-3 pb-2">
        <View
          className="flex-row items-center px-4 py-3 rounded-2xl border"
          style={{
            backgroundColor: theme.card,
            borderColor: theme.border,
          }}
        >
          <Icon name="search" size={16} color={theme.secondaryText} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder={`Search ${primaryLang.toUpperCase()} & global playlists...`}
            placeholderTextColor={theme.mutedText}
            className="flex-1 ml-3 text-sm font-semibold"
            style={{ color: theme.primaryText }}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearchChange("")} hitSlop={10}>
              <Icon name="close" size={16} color={theme.secondaryText} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Category Filter Pills ───────────────────────────────────── */}
      {searchQuery.length === 0 && (
        <View className="py-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleSelectCategory(cat.id)}
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
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Main Body ───────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
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
        {/* Loading Skeletons */}
        {loading && !refreshing ? (
          <View className="px-5 pt-4 flex-row flex-wrap justify-between gap-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={{ width: CARD_WIDTH }}>
                <View
                  className="w-full aspect-square rounded-2xl mb-2"
                  style={{ backgroundColor: theme.card }}
                />
                <View
                  className="w-3/4 h-4 rounded-md mb-1"
                  style={{ backgroundColor: theme.card }}
                />
                <View
                  className="w-1/2 h-3 rounded-md"
                  style={{ backgroundColor: theme.card }}
                />
              </View>
            ))}
          </View>
        ) : searchQuery.length > 0 ? (
          /* ── Search Results Grid ── */
          <View className="px-5 pt-4">
            <Text
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: theme.secondaryText }}
            >
              Search Results ({searchResults.length})
            </Text>

            {searchResults.length === 0 && !searching ? (
              <View className="py-16 items-center justify-center">
                <Icon name="disc" size={48} color={theme.mutedText} />
                <Text
                  className="text-base font-bold mt-4"
                  style={{ color: theme.primaryText }}
                >
                  No playlists found
                </Text>
                <Text
                  className="text-xs mt-1 text-center"
                  style={{ color: theme.secondaryText }}
                >
                  Try searching for another keyword or language.
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between gap-y-4">
                {searchResults.map((pl) => (
                  <PlaylistGridCard
                    key={pl.id}
                    playlist={pl}
                    onPress={() => handleOpenPlaylist(pl)}
                    theme={theme}
                  />
                ))}
              </View>
            )}
          </View>
        ) : activeCategory === "my_playlists" ? (
          /* ── My Playlists Tab ── */
          <View className="px-5 pt-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: theme.secondaryText }}
              >
                Custom Playlists ({myPlaylists.length})
              </Text>
              {!isGuest && (
                <Pressable
                  onPress={() => router.push("/playlists/create")}
                  className="flex-row items-center"
                >
                  <Icon name="plus" size={14} color={theme.accent} />
                  <Text className="text-xs font-bold ml-1" style={{ color: theme.accent }}>
                    New Playlist
                  </Text>
                </Pressable>
              )}
            </View>

            {myPlaylists.length === 0 ? (
              <View className="py-16 items-center justify-center">
                <Icon name="list" size={48} color={theme.mutedText} />
                <Text
                  className="text-base font-bold mt-4"
                  style={{ color: theme.primaryText }}
                >
                  No custom playlists yet
                </Text>
                <Text
                  className="text-xs mt-1 text-center"
                  style={{ color: theme.secondaryText }}
                >
                  Create your own custom playlists to save your favorite tracks!
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between gap-y-4">
                {myPlaylists.map((pl) => (
                  <PlaylistGridCard
                    key={pl.id}
                    playlist={{
                      id: pl.id,
                      title: pl.name,
                      image: pl.cover_url || pl.coverImage,
                      subtitle: pl.description || "Personal Playlist",
                    }}
                    onPress={() =>
                      handleOpenPlaylist({
                        id: pl.id,
                        title: pl.name,
                        image: pl.cover_url || pl.coverImage,
                        subtitle: pl.description,
                        isSaavn: false,
                      })
                    }
                    theme={theme}
                  />
                ))}
              </View>
            )}
          </View>
        ) : activeCategory !== "all" ? (
          /* ── Single Category Grid ── */
          <View className="px-5 pt-4">
            <Text
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: theme.secondaryText }}
            >
              {CATEGORIES.find((c) => c.id === activeCategory)?.label} ({categoryPlaylists.length})
            </Text>
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {categoryPlaylists.map((pl) => (
                <PlaylistGridCard
                  key={pl.id}
                  playlist={pl}
                  onPress={() => handleOpenPlaylist(pl)}
                  theme={theme}
                />
              ))}
            </View>
          </View>
        ) : (
          /* ── "All" Categories View ── */
          <View className="pt-2">
            {/* 1. My Playlists (if any) */}
            {myPlaylists.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between px-5 mb-3">
                  <Text
                    className="text-base font-extrabold tracking-tight"
                    style={{ color: theme.primaryText }}
                  >
                    My Playlists
                  </Text>
                  <Pressable onPress={() => setActiveCategory("my_playlists")}>
                    <Text className="text-xs font-bold" style={{ color: theme.accent }}>
                      See All
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                >
                  {myPlaylists.map((pl) => (
                    <Pressable
                      key={pl.id}
                      onPress={() =>
                        handleOpenPlaylist({
                          id: pl.id,
                          title: pl.name,
                          image: pl.cover_url || pl.coverImage,
                          subtitle: pl.description,
                          isSaavn: false,
                        })
                      }
                      className="w-36 active:scale-95 transition-transform"
                    >
                      <Image
                        source={{
                          uri:
                            pl.cover_url ||
                            pl.coverImage ||
                            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
                        }}
                        style={{ width: 144, height: 144, borderRadius: 20 }}
                        className="border border-white/10 shadow-sm"
                        contentFit="cover"
                      />
                      <Text
                        className="text-xs font-bold mt-2 text-left"
                        numberOfLines={1}
                        style={{ color: theme.primaryText }}
                      >
                        {pl.name}
                      </Text>
                      <Text
                        className="text-[11px] font-medium mt-0.5 text-left"
                        numberOfLines={1}
                        style={{ color: theme.secondaryText }}
                      >
                        {pl.description || "Custom Playlist"}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 2. Top Charts & Editorial */}
            {featuredPlaylists.length > 0 && (
              <PlaylistHorizontalSection
                title="Top Charts & Featured"
                playlists={featuredPlaylists}
                onOpenPlaylist={handleOpenPlaylist}
                theme={theme}
              />
            )}

            {/* 3. Let's Play Artist Compilations */}
            {artistPlaylists.length > 0 && (
              <PlaylistHorizontalSection
                title="Let's Play (Artist Specials)"
                playlists={artistPlaylists}
                onOpenPlaylist={handleOpenPlaylist}
                theme={theme}
              />
            )}

            {/* 4. Decades & Golden Eras */}
            {decadePlaylists.length > 0 && (
              <PlaylistHorizontalSection
                title="Decades & Nostalgia (80s, 90s, 2000s)"
                playlists={decadePlaylists}
                onOpenPlaylist={handleOpenPlaylist}
                theme={theme}
              />
            )}

            {/* 5. Moods & Kuthu */}
            {moodPlaylists.length > 0 && (
              <PlaylistHorizontalSection
                title="Kuthu, Melodies & Party"
                playlists={moodPlaylists}
                onOpenPlaylist={handleOpenPlaylist}
                theme={theme}
              />
            )}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function PlaylistGridCard({
  playlist,
  onPress,
  theme,
}: {
  playlist: SaavnPlaylist | { id: string; title: string; image?: string; subtitle?: string };
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: CARD_WIDTH }}
      className="active:scale-95 transition-transform"
    >
      <View className="relative">
        <Image
          source={{
            uri:
              playlist.image ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
          }}
          style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 20 }}
          className="border border-white/10 shadow-md"
          contentFit="cover"
        />
        {(playlist as any).songCount ? (
          <View
            className="absolute top-2 left-2 px-2 py-0.5 rounded-lg border"
            style={{
              backgroundColor: "rgba(0,0,0,0.75)",
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <Text className="text-[10px] font-bold text-white">
              {(playlist as any).songCount} Tracks
            </Text>
          </View>
        ) : null}
        <View
          className="w-8 h-8 rounded-full items-center justify-center absolute right-2.5 bottom-2.5 shadow-md"
          style={{ backgroundColor: theme.accent }}
        >
          <Icon name="play" size={14} color="#000000" />
        </View>
      </View>
      <Text
        className="text-xs font-bold mt-2 text-left"
        numberOfLines={1}
        style={{ color: theme.primaryText }}
      >
        {playlist.title}
      </Text>
      <Text
        className="text-[11px] font-medium mt-0.5 text-left"
        numberOfLines={1}
        style={{ color: theme.secondaryText }}
      >
        {playlist.subtitle || "JioSaavn Playlist"}
      </Text>
    </Pressable>
  );
}

function PlaylistHorizontalSection({
  title,
  playlists,
  onOpenPlaylist,
  theme,
}: {
  title: string;
  playlists: SaavnPlaylist[];
  onOpenPlaylist: (pl: SaavnPlaylist) => void;
  theme: any;
}) {
  return (
    <View className="mb-6">
      <View className="px-5 mb-3">
        <Text
          className="text-base font-extrabold tracking-tight"
          style={{ color: theme.primaryText }}
        >
          {title}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
      >
        {playlists.map((pl) => (
          <Pressable
            key={pl.id}
            onPress={() => onOpenPlaylist(pl)}
            className="w-36 active:scale-95 transition-transform"
          >
            <View className="relative">
              <Image
                source={{
                  uri:
                    pl.image ||
                    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
                }}
                style={{ width: 144, height: 144, borderRadius: 22 }}
                className="border border-white/10 shadow-md"
                contentFit="cover"
              />
              {pl.songCount ? (
                <View
                  className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg border shadow-sm"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.75)",
                    borderColor: "rgba(255,255,255,0.15)",
                  }}
                >
                  <Text className="text-[10px] font-bold text-white">
                    {pl.songCount} Tracks
                  </Text>
                </View>
              ) : null}
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
              {pl.title}
            </Text>
            <Text
              className="text-xs font-medium mt-0.5 text-left"
              numberOfLines={1}
              style={{ color: theme.secondaryText }}
            >
              {pl.subtitle || "JioSaavn Playlist"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
