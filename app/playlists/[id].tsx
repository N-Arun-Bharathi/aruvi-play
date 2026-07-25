import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
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
import { dbGetPlaylistSongs, dbDeletePlaylist, dbRemoveSongFromPlaylist } from "../../services/sqlite";
import { supabase } from "../../services/supabase";
import { Song } from "../../types/song";

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  
  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPlaylistDetails();
    }
  }, [id]);

  const loadPlaylistDetails = async () => {
    setLoading(true);
    try {
      const { data: pl, error: plErr } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id)
        .single();
      
      if (pl) {
        setPlaylist(pl);
      }

      const cachedSongs = await dbGetPlaylistSongs(id);
      setSongs(cachedSongs);

      const { data: serverSongs, error } = await supabase
        .from("playlist_songs")
        .select("song_id, songs(*)")
        .eq("playlist_id", id);

      if (serverSongs && !error) {
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
    } catch (e) {
      Alert.alert("Error", "Failed to remove song from playlist");
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

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader
        title={playlist.name}
        subtitle="Playlist"
        showBack
        rightActions={
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.push(`/playlists/edit/${id}` as any)}
              className="p-2 mr-2 bg-white/5 rounded-full active:bg-white/10"
            >
              <Icon name="edit" size={18} color={theme.primaryText} />
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
              <Text className="text-sm leading-relaxed mb-4" style={{ color: theme.secondaryText }}>
                {playlist.description}
              </Text>
            ) : null}
            <Text className="text-xs font-semibold mb-4" style={{ color: theme.mutedText }}>
              {songs.length} songs • Created by you
            </Text>

            {songs.length > 0 && (
              <View className="flex-row">
                <Pressable
                  onPress={() => handlePlayAll(false)}
                  className="flex-1 flex-row items-center justify-center py-3 rounded-2xl mr-2.5 active:opacity-90"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Icon name="play" size={16} color="#000000" />
                  <Text className="font-bold ml-2 text-xs" style={{ color: "#000000" }}>Play All</Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePlayAll(true)}
                  className="flex-1 flex-row items-center justify-center py-3 rounded-2xl ml-2.5 border active:bg-white/5"
                  style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
                >
                  <Icon name="shuffle" size={16} color={theme.primaryText} />
                  <Text className="font-bold ml-2 text-xs" style={{ color: theme.primaryText }}>Shuffle</Text>
                </Pressable>
              </View>
            )}
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
              <Icon name="close" size={20} color={theme.mutedText} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View className="px-5 py-12 items-center justify-center">
            <Icon name="music" size={48} color={theme.mutedText} />
            <Text className="text-base font-bold mt-4" style={{ color: theme.primaryText }}>
              This playlist is empty
            </Text>
            <Text className="text-xs mt-1 text-center" style={{ color: theme.secondaryText }}>
              {"Tap the search tab, search for tracks, and choose \"Add to playlist\" from the song menu."}
            </Text>
            <PrimaryButton
              title="Find Music"
              onPress={() => router.push("/(tabs)/search" as any)}
              className="mt-6"
            />
          </View>
        }
      />
    </AppScreen>
  );
}
