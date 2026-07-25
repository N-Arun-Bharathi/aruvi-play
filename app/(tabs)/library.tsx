import React, { useState, useMemo, useEffect } from "react";
import { View, Text, FlatList, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../utils/theme";
import { Icon } from "../../components/Icon";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { SongRow } from "../../components/SongRow";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRow } from "../../components/SkeletonRow";
import { pickLocalSongs } from "../../services/localFiles";
import { dbGetPlaylists } from "../../services/sqlite";
import { supabase } from "../../services/supabase";
import { Song } from "../../types/song";

type Tab = "liked" | "playlists" | "local";

export default function Library() {
  const router = useRouter();
  const theme = useTheme();
  const liked = useLibraryStore((s) => s.liked);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const user = useAuthStore((s) => s.userProfile);

  const currentSong = usePlayerStore((s) => s.current);
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const bottomPadding = currentSong ? 170 : 120;

  const [tab, setTab] = useState<Tab>("liked");
  const [local, setLocal] = useState<Song[]>([]);
  const [search, setSearch] = useState("");

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const userId = user?.id || "guest-user";

  useEffect(() => {
    if (tab === "playlists") {
      fetchPlaylists();
    }
  }, [tab, userId]);

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const cached = await dbGetPlaylists(userId);
      setPlaylists(cached);

      const { data: serverPlaylists, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", userId);

      if (serverPlaylists && !error) {
        setPlaylists(serverPlaylists);
      }
    } catch (e) {
      console.warn("Failed to fetch playlists:", e);
    } finally {
      setLoadingPlaylists(false);
    }
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

  const filteredPlaylists = useMemo(() => {
    if (!search.trim()) return playlists;
    const q = search.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(q));
  }, [playlists, search]);

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
            placeholder={`Search in ${tab === "liked" ? "liked songs" : tab === "playlists" ? "playlists" : "local files"}...`}
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
        /* PLAYLISTS TAB VIEW */
        <FlatList
          data={filteredPlaylists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: bottomPadding }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              onPress={() => router.push("/playlists/create" as any)}
              className="flex-row items-center p-4 rounded-2xl border mb-4 active:bg-white/5"
              style={{
                backgroundColor: `${theme.accent}08`,
                borderColor: `${theme.accent}15`,
              }}
            >
              <View 
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{ backgroundColor: theme.elevatedSurface }}
              >
                <Icon name="plus" size={20} color={theme.accent} />
              </View>
              <Text className="ml-4 font-bold text-sm" style={{ color: theme.accent }}>
                Create New Playlist
              </Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/playlists/${item.id}` as any)}
              className="flex-row items-center justify-between p-4 rounded-2xl mb-3 border active:bg-white/5"
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
                  <Text className="font-bold text-sm" style={{ color: theme.primaryText }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }} numberOfLines={1}>
                    {item.song_count} songs
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={16} color={theme.mutedText} />
            </Pressable>
          )}
          ListEmptyComponent={
            search ? (
              <EmptyState
                iconName="search"
                title="No playlists found"
                description={`No playlists matched "${search}".`}
              />
            ) : (
              loadingPlaylists ? (
                <View className="py-8"><SkeletonRow /></View>
              ) : (
                <EmptyState
                  iconName="library"
                  title="Create a playlist"
                  description="Keep your music grouped together by creating custom playlists."
                  actionLabel="Create Playlist"
                  onAction={() => router.push("/playlists/create" as any)}
                />
              )
            )
          }
        />
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
              <View className="w-12 h-12 rounded-xl items-center justify-center border" style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}>
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
                  <View 
                    className="absolute -right-20 -bottom-20 w-44 h-44 rounded-full opacity-10 blur-3xl" 
                    style={{ backgroundColor: theme.accent }}
                  />

                  <View className="flex-row items-center">
                    <View 
                      className="w-16 h-16 rounded-2xl items-center justify-center shadow"
                      style={{ backgroundColor: `${theme.accent}15` }}
                    >
                      <Icon name="heart-filled" size={28} color={theme.error} />
                    </View>
                    <View className="ml-4 justify-center flex-1">
                      <Text className="text-lg font-bold" style={{ color: theme.primaryText }}>
                        Liked Songs
                      </Text>
                      <Text className="text-xs font-semibold mt-0.5" style={{ color: theme.secondaryText }}>
                        {liked.length} songs
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row mt-6">
                    <Pressable
                      onPress={() => playAllLiked(false)}
                      className="flex-1 flex-row items-center justify-center py-3 rounded-2xl mr-2.5 active:opacity-90"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Icon name="play" size={16} color="#000000" />
                      <Text className="font-bold ml-2 text-xs" style={{ color: "#000000" }}>Play All</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => playAllLiked(true)}
                      className="flex-1 flex-row items-center justify-center py-3 rounded-2xl ml-2.5 border active:bg-white/5"
                      style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
                    >
                      <Icon name="shuffle" size={16} color={theme.primaryText} />
                      <Text className="font-bold ml-2 text-xs" style={{ color: theme.primaryText }}>Shuffle</Text>
                    </Pressable>
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
              onPress={() => playSong(item, liked)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              iconName="heart"
              title="Your library is empty"
              description="Your liked songs will appear here. Tap the heart icon on any song to save it to your library."
              actionLabel="Find Music"
              onAction={() => router.push("/(tabs)/search" as any)}
            />
          }
        />
      )}
    </AppScreen>
  );
}
