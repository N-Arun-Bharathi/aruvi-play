import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, Alert, Modal, TextInput, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { SongRow } from "../../components/SongRow";
import { Icon } from "../../components/Icon";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SkeletonRow } from "../../components/SkeletonRow";
import { useTheme } from "../../utils/theme";
import { usePlayerStore } from "../../store/playerStore";
import { useLibraryStore } from "../../store/likedStore";
import { useToastStore } from "../../store/toastStore";
import { dbGetPlaylistSongs, dbDeletePlaylist, dbRemoveSongFromPlaylist, dbAddSongToPlaylist } from "../../services/sqlite";
import { searchSongs } from "../../services/saavn";
import { supabase } from "../../services/supabase";
import { Song } from "../../types/song";

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const toast = useToastStore();
  
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const likedSongs = useLibraryStore((s) => s.liked);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Songs Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlaylistDetails();
    }
  }, [id]);

  const loadPlaylistDetails = async () => {
    setLoading(true);
    try {
      const { data: pl } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (pl) {
        setPlaylist(pl);
      } else {
        setPlaylist({ id, name: "My Playlist", description: "", is_public: true });
      }

      const cachedSongs = await dbGetPlaylistSongs(id);
      setSongs(cachedSongs);

      const { data: serverSongs, error } = await supabase
        .from("playlist_songs")
        .select("song_id, position, songs(*)")
        .eq("playlist_id", id)
        .order("position", { ascending: true });

      if (serverSongs && !error && serverSongs.length > 0) {
        const formatted: Song[] = serverSongs
          .map((item: any) => {
            const s = item.songs;
            if (!s) return null;
            return {
              id: s.id,
              title: s.title,
              artist: s.artist,
              album: s.album || "",
              artwork: s.artwork_url || "",
              url: s.source_url || "",
              duration: s.duration_seconds || 0,
              source: s.source_type === "local" ? "local" : "online",
            } as Song;
          })
          .filter(Boolean) as Song[];
        setSongs(formatted);
      }
    } catch (e) {
      console.warn("Failed to load playlist", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = (shuffle = false) => {
    if (songs.length === 0) return;
    const list = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;
    playSong(list[0], songs);
    router.push("/player");
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Playlist",
      "Are you sure you want to delete this playlist? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from("playlists").delete().eq("id", id);
              await dbDeletePlaylist(id);
              toast.show("Playlist deleted.");
              router.back();
            } catch (e) {
              Alert.alert("Error", "Failed to delete playlist");
            }
          },
        },
      ]
    );
  };

  const removeSong = async (songId: string) => {
    try {
      await supabase
        .from("playlist_songs")
        .delete()
        .eq("playlist_id", id)
        .eq("song_id", songId);
      await dbRemoveSongFromPlaylist(id, songId);
      setSongs(songs.filter((s) => s.id !== songId));
      toast.show("Song removed from playlist.");
    } catch (e) {
      Alert.alert("Error", "Failed to remove song from playlist");
    }
  };

  const handleAddSongToPlaylist = async (song: Song) => {
    try {
      const position = songs.length + 1;
      
      // Save to local SQLite
      await dbAddSongToPlaylist(id, song, position);

      // Save to Supabase server
      try {
        await supabase.from("songs").upsert({
          id: song.id,
          title: song.title,
          normalized_title: song.title.toLowerCase(),
          artist: song.artist,
          album: song.album || "",
          artwork_url: song.artwork || "",
          source_type: song.source || "online",
          source_url: song.url || "",
          duration_seconds: song.duration || 0,
        }, { onConflict: "id" });

        await supabase.from("playlist_songs").insert({
          playlist_id: id,
          song_id: song.id,
          position,
        });
      } catch (srvErr) {
        console.warn("Supabase playlist song insert warning:", srvErr);
      }

      setSongs((prev) => {
        if (prev.some((s) => s.id === song.id)) return prev;
        return [...prev, song];
      });

      toast.show(`Added "${song.title}" to playlist!`);
    } catch (e: any) {
      toast.show("Failed to add song to playlist.");
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchSongs(query.trim());
      setSearchResults(results);
    } catch (e) {
      console.warn("Search songs error:", e);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <AppScreen edges={["top", "bottom"]}>
        <AppHeader title="Loading Playlist..." showBack />
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      </AppScreen>
    );
  }

  if (!playlist) {
    return (
      <AppScreen edges={["top", "bottom"]}>
        <AppHeader title="Playlist" showBack />
        <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: theme.background }}>
          <Text className="text-lg font-bold" style={{ color: theme.primaryText }}>Playlist not found</Text>
          <Text className="text-sm mt-2 text-center" style={{ color: theme.secondaryText }}>It may have been deleted or is private.</Text>
        </View>
      </AppScreen>
    );
  }

  const existingSongIds = new Set(songs.map((s) => s.id));

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader
        title={playlist.name}
        subtitle="Playlist"
        showBack
        rightActions={
          <View className="flex-row items-center">
            <Pressable
              onPress={() => setShowAddModal(true)}
              className="p-2 mr-2 bg-accent/20 rounded-full active:bg-accent/30 flex-row items-center px-3 py-1.5"
            >
              <Icon name="plus" size={14} color={theme.accent} />
              <Text className="text-xs font-bold ml-1.5" style={{ color: theme.accent }}>Add Songs</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              className="p-2 bg-red-500/10 rounded-full active:bg-red-500/20"
            >
              <Icon name="trash" size={18} color={theme.error} />
            </Pressable>
          </View>
        }
      />

      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View className="p-5 border-b" style={{ borderBottomColor: theme.border }}>
            {playlist.description ? (
              <Text className="text-sm leading-relaxed mb-3" style={{ color: theme.secondaryText }}>
                {playlist.description}
              </Text>
            ) : null}
            <Text className="text-xs font-semibold mb-4" style={{ color: theme.mutedText }}>
              {songs.length} songs • Visible to everyone
            </Text>

            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => setShowAddModal(true)}
                className="flex-1 flex-row items-center justify-center py-3 rounded-2xl border active:bg-white/5"
                style={{ backgroundColor: theme.glassCard, borderColor: theme.glassBorder }}
              >
                <Icon name="plus" size={16} color={theme.accent} />
                <Text className="font-bold ml-2 text-xs" style={{ color: theme.accent }}>+ Add Songs</Text>
              </Pressable>

              {songs.length > 0 && (
                <>
                  <Pressable
                    onPress={() => handlePlayAll(false)}
                    className="flex-1 flex-row items-center justify-center py-3 rounded-2xl active:opacity-90"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Icon name="play" size={16} color="#000000" />
                    <Text className="font-bold ml-2 text-xs" style={{ color: "#000000" }}>Play All</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handlePlayAll(true)}
                    className="p-3 rounded-2xl border active:bg-white/5 items-center justify-center"
                    style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
                  >
                    <Icon name="shuffle" size={16} color={theme.primaryText} />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center">
            <View className="flex-1">
              <SongRow
                song={item}
                liked={isLiked(item)}
                onLike={() => toggleLike(item)}
                onAddToQueue={() => addToQueue(item)}
                onPress={() => {
                  playSong(item, songs);
                  router.push("/player");
                }}
              />
            </View>
            <Pressable
              onPress={() => removeSong(item.id)}
              className="pr-4 pl-2 py-3 active:opacity-60"
            >
              <Icon name="close" size={18} color={theme.mutedText} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View className="px-5 py-12 items-center justify-center">
            <Icon name="music" size={48} color={theme.mutedText} />
            <Text className="text-base font-bold mt-4" style={{ color: theme.primaryText }}>
              This playlist is empty
            </Text>
            <Text className="text-xs mt-1 text-center leading-relaxed" style={{ color: theme.secondaryText }}>
              Tap below to search online tracks or add from your liked songs.
            </Text>
            <PrimaryButton
              title="+ Add Songs Now"
              onPress={() => setShowAddModal(true)}
              className="mt-6"
            />
          </View>
        }
      />

      {/* Add Songs Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <AppScreen edges={["top", "bottom"]}>
          <AppHeader
            title="Add Songs"
            subtitle={`to ${playlist.name}`}
            rightActions={
              <Pressable onPress={() => setShowAddModal(false)} className="px-3 py-1.5 rounded-full bg-white/10">
                <Text className="text-xs font-bold text-white">Done</Text>
              </Pressable>
            }
          />
          <View className="flex-1 px-4 pt-3" style={{ backgroundColor: theme.background }}>
            {/* Search Input */}
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search online songs..."
              placeholderTextColor={theme.mutedText}
              className="px-4 py-3 rounded-2xl border text-sm mb-4"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.primaryText,
              }}
            />

            <Text className="text-xs font-bold uppercase tracking-wider mb-3 ml-1" style={{ color: theme.secondaryText }}>
              {searchQuery ? "Search Results" : "Your Liked Songs"}
            </Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
              {(searchQuery ? searchResults : likedSongs).map((song) => {
                const added = existingSongIds.has(song.id);
                return (
                  <View
                    key={song.id}
                    className="flex-row items-center justify-between py-2.5 border-b"
                    style={{ borderBottomColor: theme.border }}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-bold" style={{ color: theme.primaryText }} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleAddSongToPlaylist(song)}
                      disabled={added}
                      className="px-3 py-1.5 rounded-xl border flex-row items-center active:opacity-80"
                      style={{
                        backgroundColor: added ? theme.accentMuted : theme.accent,
                        borderColor: added ? theme.glassBorder : theme.accent,
                      }}
                    >
                      <Icon name={added ? "check" : "plus"} size={14} color={added ? theme.accent : "#000000"} />
                      <Text
                        className="text-xs font-bold ml-1"
                        style={{ color: added ? theme.accent : "#000000" }}
                      >
                        {added ? "Added" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}
