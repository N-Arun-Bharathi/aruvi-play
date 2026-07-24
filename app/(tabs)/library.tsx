import React, { useState, useMemo, useEffect } from "react";
import { View, Text, FlatList, Pressable, Alert, TextInput, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { useAuthStore } from "../../store/authStore";
import { SongRow } from "../../components/SongRow";
import { Icon } from "../../components/Icon";
import { Song } from "../../types/song";
import { pickLocalSongs } from "../../services/localFiles";
import { useScrollHandler } from "../../hooks/useScrollHandler";
import { supabase } from "../../services/supabase";
import { dbGetPlaylists, dbSavePlaylist, dbDeletePlaylist, dbGetPlaylistSongs, dbAddSongToPlaylist, dbRemoveSongFromPlaylist } from "../../services/sqlite";

type Tab = "liked" | "playlists" | "local";

export default function Library() {
  const liked = useLibraryStore((s) => s.liked);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const hydrateLiked = useLibraryStore((s) => s.hydrate);

  const playSong = usePlayerStore((s) => s.playSong);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const user = useAuthStore((s) => s.userProfile);

  const [tab, setTab] = useState<Tab>("liked");
  const [local, setLocal] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const onScroll = useScrollHandler();

  // Playlists States
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");

  const userId = user?.id || "guest-user";

  // Load playlists on mount and tab change
  useEffect(() => {
    if (tab === "playlists") {
      fetchPlaylists();
    }
  }, [tab, userId]);

  // If inside selected playlist, fetch its songs
  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistSongs(selectedPlaylist.id);
    }
  }, [selectedPlaylist]);

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      // 1. Fetch cached from SQLite
      const cached = await dbGetPlaylists(userId);
      setPlaylists(cached);

      // 2. Fetch fresh from Supabase
      const { data: serverPlaylists, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", userId);

      if (serverPlaylists && !error) {
        // Save to SQLite
        for (const pl of serverPlaylists) {
          await dbSavePlaylist({
            id: pl.id,
            userId: pl.user_id,
            name: pl.name,
            description: pl.description,
            coverImage: pl.cover_url,
            isPublic: pl.is_public
          });
        }
        setPlaylists(serverPlaylists);
      }
    } catch (e) {
      console.warn("Failed to sync playlists with server:", e);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const fetchPlaylistSongs = async (playlistId: string) => {
    try {
      // 1. Fetch from SQLite
      const cachedSongs = await dbGetPlaylistSongs(playlistId);
      setPlaylistSongs(cachedSongs);

      // 2. Fetch from Supabase
      const { data: serverSongs, error } = await supabase
        .from("playlist_songs")
        .select("song_id, songs(*)")
        .eq("playlist_id", playlistId);

      if (serverSongs && !error) {
        const songs: Song[] = serverSongs
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

        // Sync local SQLite playlist songs
        const currentLocal = await dbGetPlaylistSongs(playlistId);
        for (const lSong of currentLocal) {
          if (!songs.some(s => s.id === lSong.id)) {
            await dbRemoveSongFromPlaylist(playlistId, lSong.id);
          }
        }
        for (let i = 0; i < songs.length; i++) {
          await dbAddSongToPlaylist(playlistId, songs[i], i);
        }
        setPlaylistSongs(songs);
      }
    } catch (e) {
      console.warn("Failed to fetch playlist songs:", e);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }

    try {
      const plId = supabase.auth.getSession ? undefined : Math.random().toString(36).substr(2, 9);
      
      // Insert to Supabase
      const { data: pl, error } = await supabase
        .from("playlists")
        .insert({
          user_id: userId,
          name: newPlaylistName.trim(),
          description: newPlaylistDesc.trim(),
          is_public: false
        })
        .select()
        .single();

      if (error) throw error;

      // Save to SQLite
      await dbSavePlaylist({
        id: pl.id,
        userId: pl.user_id,
        name: pl.name,
        description: pl.description,
        isPublic: pl.is_public
      });

      setNewPlaylistName("");
      setNewPlaylistDesc("");
      setCreateModalVisible(false);
      fetchPlaylists();
      Alert.alert("Success", "Playlist created successfully!");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to create playlist");
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    Alert.alert(
      "Delete Playlist",
      "Are you sure you want to delete this playlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete from Supabase
              await supabase.from("playlists").delete().eq("id", playlistId);
              // Delete from SQLite
              await dbDeletePlaylist(playlistId);
              
              setSelectedPlaylist(null);
              fetchPlaylists();
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const filteredData = useMemo(() => {
    const raw = tab === "liked" ? liked : local;
    if (!search.trim()) return raw;
    const q = search.toLowerCase();
    return raw.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.artist.toLowerCase().includes(q)
    );
  }, [tab, liked, local, search]);

  const filteredPlaylistSongs = useMemo(() => {
    if (!search.trim()) return playlistSongs;
    const q = search.toLowerCase();
    return playlistSongs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q)
    );
  }, [playlistSongs, search]);

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
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {selectedPlaylist ? (
        /* PLAYLIST SONGS VIEW */
        <View className="flex-1">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/5">
            <Pressable onPress={() => setSelectedPlaylist(null)} className="p-2 bg-white/5 rounded-full active:bg-white/10">
              <Icon name="chevron-down" size={20} style={{ transform: [{ rotate: "90deg" }] }} />
            </Pressable>
            <View className="items-center max-w-[60%]">
              <Text className="text-text font-bold text-lg" numberOfLines={1}>{selectedPlaylist.name}</Text>
              <Text className="text-muted text-[10px] mt-0.5" numberOfLines={1}>{selectedPlaylist.description || "No description"}</Text>
            </View>
            <Pressable onPress={() => handleDeletePlaylist(selectedPlaylist.id)} className="p-2 bg-destructive/10 rounded-full active:bg-destructive/20">
              <Icon name="profile" size={18} color="#FF453A" />
            </Pressable>
          </View>

          <FlatList
            onScroll={onScroll}
            scrollEventThrottle={16}
            data={filteredPlaylistSongs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 180, paddingTop: 10 }}
            renderItem={({ item }) => (
              <SongRow
                song={item}
                liked={isLiked(item)}
                onLike={() => toggleLike(item)}
                onAddToQueue={() => addToQueue(item)}
                onPress={() => playSong(item, playlistSongs)}
              />
            )}
            ListEmptyComponent={
              <View className="px-5 mt-16 items-center justify-center">
                <Icon name="music" size={48} color="#333" />
                <Text className="text-muted text-center mt-4 text-sm font-medium">
                  This playlist is empty. Add songs to it from search!
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        /* NORMAL LIBRARY SECTIONS */
        <View className="flex-1">
          <View className="px-5 pt-4">
            <Text className="text-text text-3xl font-bold mb-4">Library</Text>
            
            {/* Tab Capsules */}
            <View className="flex-row bg-surface p-1 rounded-2xl mb-4 border border-white/5">
              <TabButton
                active={tab === "liked"}
                label="Liked Songs"
                onPress={() => setTab("liked")}
              />
              <TabButton
                active={tab === "playlists"}
                label="Playlists"
                onPress={() => setTab("playlists")}
              />
              <TabButton
                active={tab === "local"}
                label="Local Files"
                onPress={() => setTab("local")}
              />
            </View>

            {/* Library Search bar */}
            <View className="flex-row items-center bg-surface px-4 py-2.5 rounded-xl mb-4 border border-white/5">
              <Icon name="search" size={16} color="#A0A0A0" />
              <TextInput
                className="flex-1 ml-3 text-text text-sm"
                placeholder={`Search ${tab === "liked" ? "liked songs" : tab === "playlists" ? "playlists" : "local files"}...`}
                placeholderTextColor="#7A7A7A"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <View style={{ transform: [{ rotate: "45deg" }] }}>
                    <Icon name="plus" size={16} color="#A0A0A0" />
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          {/* Liked Play All controls */}
          {tab === "liked" && liked.length > 0 && !search && (
            <View className="flex-row px-5 mb-4">
              <Pressable
                onPress={() => playAllLiked(false)}
                className="flex-1 flex-row items-center justify-center bg-accent py-3 rounded-2xl mr-2.5 active:opacity-85"
              >
                <Icon name="play" size={18} color="black" />
                <Text className="text-black font-bold ml-2 text-sm">Play All</Text>
              </Pressable>
              <Pressable
                onPress={() => playAllLiked(true)}
                className="flex-1 flex-row items-center justify-center bg-surface py-3 rounded-2xl ml-2.5 border border-white/10 active:bg-white/10"
              >
                <Icon name="shuffle" size={18} color="white" />
                <Text className="text-text font-bold ml-2 text-sm">Shuffle</Text>
              </Pressable>
            </View>
          )}

          {/* Local files importer row */}
          {tab === "local" && (
            <Pressable
              onPress={importLocal}
              className="mx-5 mb-4 flex-row items-center bg-surface rounded-2xl p-4 active:opacity-75 border border-white/5"
            >
              <Icon name="folder" size={20} color="#1DB954" />
              <Text className="text-text ml-3 font-semibold text-sm">Import local audio files</Text>
            </Pressable>
          )}

          {/* Render Tab Contents */}
          {tab === "playlists" ? (
            /* PLAYLISTS LISTING */
            <View className="flex-1 px-5">
              <Pressable
                onPress={() => setCreateModalVisible(true)}
                className="mb-4 flex-row items-center bg-accent/10 border border-accent/20 rounded-2xl p-4 active:opacity-80"
              >
                <Icon name="plus" size={20} color="#1DB954" />
                <Text className="text-accent ml-3 font-bold text-sm">Create New Playlist</Text>
              </Pressable>

              {loadingPlaylists ? (
                <ActivityIndicator color="#1DB954" className="mt-8" />
              ) : (
                <FlatList
                  data={playlists}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 180 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setSelectedPlaylist(item)}
                      className="flex-row items-center justify-between p-4 bg-surface rounded-2xl mb-3 border border-white/5 active:bg-white/5"
                    >
                      <View className="flex-row items-center flex-1 pr-4">
                        <View className="w-12 h-12 bg-surface2 rounded-xl items-center justify-center border border-white/10">
                          <Icon name="library" size={20} color="#1DB954" />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-text font-bold text-sm" numberOfLines={1}>{item.name}</Text>
                          <Text className="text-muted text-[10px] mt-0.5" numberOfLines={1}>{item.description || "Playlist"}</Text>
                        </View>
                      </View>
                      <Icon name="next" size={14} color="#A0A0A0" />
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text className="text-muted text-center mt-12 text-sm">No playlists created yet.</Text>
                  }
                />
              )}
            </View>
          ) : (
            /* LIKED & LOCAL SONGS FLATLIST */
            <FlatList
              onScroll={onScroll}
              scrollEventThrottle={16}
              data={filteredData}
              keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
              contentContainerStyle={{ paddingBottom: 180 }}
              renderItem={({ item }) => (
                <SongRow
                  song={item}
                  liked={isLiked(item)}
                  onLike={() => toggleLike(item)}
                  onAddToQueue={() => addToQueue(item)}
                  onPress={() => playSong(item, tab === "liked" ? liked : local)}
                />
              )}
              ListEmptyComponent={
                <View className="px-5 mt-16 items-center justify-center">
                  <Icon
                    name={tab === "liked" ? "heart" : "folder"}
                    size={48}
                    color="#333"
                  />
                  <Text className="text-muted text-center mt-4 text-sm font-medium">
                    {tab === "liked"
                      ? "Liked songs will appear here."
                      : "No local audio files imported."}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* CREATE PLAYLIST MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-surface rounded-t-[32px] p-6 border-t border-white/10 h-[50%]">
            <Text className="text-text text-xl font-bold mb-4">Create Playlist</Text>
            <TextInput
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Playlist Name"
              placeholderTextColor="#7A7A7A"
              className="text-text text-sm p-4 bg-white/5 border border-white/10 rounded-2xl mb-4"
              autoFocus
            />
            <TextInput
              value={newPlaylistDesc}
              onChangeText={setNewPlaylistDesc}
              placeholder="Description (Optional)"
              placeholderTextColor="#7A7A7A"
              className="text-text text-sm p-4 bg-white/5 border border-white/10 rounded-2xl mb-6"
            />
            <View className="flex-row justify-between">
              <Pressable
                onPress={() => setCreateModalVisible(false)}
                className="flex-1 mr-2 py-4 bg-white/10 rounded-2xl items-center"
              >
                <Text className="text-text font-bold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreatePlaylist}
                className="flex-1 ml-2 py-4 bg-accent rounded-2xl items-center"
              >
                <Text className="text-black font-bold">Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2 rounded-xl items-center ${
        active ? "bg-white/10" : "bg-transparent"
      }`}
    >
      <Text className={`text-xs font-semibold ${active ? "text-text" : "text-muted"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
