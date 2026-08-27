import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Song } from "../types/song";
import { Icon } from "./Icon";
import { useTheme } from "../utils/theme";
import { useLibraryStore } from "../store/likedStore";
import { usePlayerStore } from "../store/playerStore";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { dbGetPlaylists, dbAddSongToPlaylist, dbSavePlaylist } from "../services/sqlite";
import { supabase } from "../services/supabase";

interface SongOptionsModalProps {
  song: Song | null;
  visible: boolean;
  onClose: () => void;
}

export function SongOptionsModal({ song, visible, onClose }: SongOptionsModalProps) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.userProfile);
  const isLiked = useLibraryStore((s) => (song ? s.isLiked(song) : false));
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const userId = user?.id || "guest-user";

  useEffect(() => {
    if (visible && showPlaylistPicker) {
      loadPlaylists();
    }
  }, [visible, showPlaylistPicker]);

  useEffect(() => {
    if (!visible) {
      setShowPlaylistPicker(false);
    }
  }, [visible]);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const localList = (await dbGetPlaylists(userId)) || [];
      const map = new Map<string, any>();
      for (const p of localList) {
        if (p && p.id) map.set(String(p.id), p);
      }

      if (userId && !userId.startsWith("guest")) {
        const { data: serverList } = await supabase
          .from("playlists")
          .select("*")
          .or(`user_id.eq.${userId},is_public.eq.true`)
          .order("created_at", { ascending: false });

        if (serverList) {
          for (const sp of serverList) {
            map.set(String(sp.id), sp);
          }
        }
      }
      setPlaylists(Array.from(map.values()));
    } catch (e) {
      console.error("Failed loading playlists:", e);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  if (!song) return null;

  const handleToggleLike = async () => {
    await toggleLike(song);
    useToastStore.getState().show(isLiked ? "Removed from Liked Songs" : "Added to Liked Songs");
    onClose();
  };

  const handlePlayNext = () => {
    usePlayerStore.getState().playNextImmediately(song);
    useToastStore.getState().show(`Playing next: ${song.title}`);
    onClose();
  };

  const handleAddToQueue = () => {
    usePlayerStore.getState().addToQueue(song);
    useToastStore.getState().show(`Added to Queue: ${song.title}`);
    onClose();
  };

  const handleShare = async () => {
    try {
      const shareUrl = song.url || `https://saavn.com/s/song/${song.id}`;
      await Share.share({
        title: song.title,
        message: `Listen to "${song.title}" by ${song.artist} on Aruvi Play!\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {
      console.error("Share error:", e);
    } finally {
      onClose();
    }
  };

  const handleAddToSpecificPlaylist = async (playlist: any) => {
    try {
      await dbAddSongToPlaylist(playlist.id, song, 0);
      if (userId && !userId.startsWith("guest")) {
        await supabase
          .from("playlist_songs")
          .insert({ playlist_id: playlist.id, song_id: song.id })
          .catch(() => {});
      }
      useToastStore.getState().show(`Added "${song.title}" to ${playlist.name}`);
    } catch (e) {
      useToastStore.getState().show("Failed to add song to playlist");
    } finally {
      onClose();
    }
  };

  const handleCreateNewPlaylist = async () => {
    const newId = `pl_${Date.now()}`;
    const newName = `My Playlist ${playlists.length + 1}`;
    const newPl = {
      id: newId,
      userId,
      name: newName,
      description: "Created from options menu",
      isPublic: false,
    };
    try {
      await dbSavePlaylist(newPl);
      await dbAddSongToPlaylist(newId, song, 0);
      useToastStore.getState().show(`Created "${newName}" & added song`);
    } catch (e) {
      console.error("Create playlist error:", e);
    } finally {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/75 justify-end">
        <Pressable className="flex-1" onPress={onClose} />

        <View
          className="rounded-t-3xl border-t p-5 shadow-2xl max-h-[85%]"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          {/* Header handle bar */}
          <View className="w-10 h-1.5 bg-white/20 rounded-full self-center mb-4" />

          {/* Song Info Header */}
          <View className="flex-row items-center mb-5 pb-4 border-b border-white/10">
            <View
              className="w-14 h-14 rounded-2xl overflow-hidden mr-3.5 border shadow-sm"
              style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.glassBorder }}
            >
              {song.artwork ? (
                <Image
                  source={{ uri: song.artwork }}
                  style={{ width: 56, height: 56 }}
                  contentFit="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Icon name="music" size={24} color={theme.secondaryText} />
                </View>
              )}
            </View>

            <View className="flex-1 mr-2">
              <Text className="text-base font-bold" style={{ color: theme.primaryText }} numberOfLines={1}>
                {song.title}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }} numberOfLines={1}>
                {song.artist} {song.album ? `• ${song.album}` : ""}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="p-2 rounded-full bg-white/10 active:bg-white/20"
            >
              <Icon name="close" size={16} color={theme.primaryText} />
            </Pressable>
          </View>

          {/* Options View or Playlist Picker View */}
          {showPlaylistPicker ? (
            <View className="min-h-[220px]">
              <View className="flex-row items-center justify-between mb-3">
                <Pressable
                  onPress={() => setShowPlaylistPicker(false)}
                  className="flex-row items-center active:opacity-70"
                >
                  <View style={{ transform: [{ rotate: "180deg" }] }}>
                    <Icon name="chevron-right" size={18} color={theme.accent} />
                  </View>
                  <Text className="text-sm font-bold ml-1" style={{ color: theme.accent }}>
                    Back
                  </Text>
                </Pressable>
                <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
                  Add to Playlist
                </Text>
                <View className="w-12" />
              </View>

              <ScrollView className="max-h-64 my-2" showsVerticalScrollIndicator={false}>
                {loadingPlaylists ? (
                  <ActivityIndicator size="small" color={theme.accent} className="my-4" />
                ) : playlists.length === 0 ? (
                  <Text className="text-xs text-center my-4" style={{ color: theme.secondaryText }}>
                    No playlists created yet.
                  </Text>
                ) : (
                  playlists.map((pl) => (
                    <Pressable
                      key={pl.id}
                      onPress={() => handleAddToSpecificPlaylist(pl)}
                      className="py-3 px-3 rounded-2xl flex-row items-center border mb-2 active:bg-white/10"
                      style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
                    >
                      <View className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 items-center justify-center mr-3">
                        <Icon name="list" size={18} color={theme.accent} />
                      </View>
                      <Text className="text-sm font-bold flex-1" style={{ color: theme.primaryText }} numberOfLines={1}>
                        {pl.name}
                      </Text>
                      <Icon name="plus" size={16} color={theme.secondaryText} />
                    </Pressable>
                  ))
                )}
              </ScrollView>

              <Pressable
                onPress={handleCreateNewPlaylist}
                className="py-3.5 rounded-2xl bg-accent items-center justify-center flex-row active:opacity-80 mt-2 shadow-sm"
              >
                <Icon name="plus" size={16} color="#000000" />
                <Text className="text-xs font-extrabold text-black ml-2">Create New Playlist</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {/* Option 1: Like / Unlike */}
              <Pressable
                onPress={handleToggleLike}
                className="py-3.5 px-3 rounded-2xl flex-row items-center active:bg-white/10 mb-1"
              >
                <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-red-500/15 border border-red-500/30">
                  <Icon name={isLiked ? "heart-filled" : "heart"} size={20} color={isLiked ? "#EF4444" : theme.primaryText} />
                </View>
                <Text className="text-sm font-bold flex-1" style={{ color: theme.primaryText }}>
                  {isLiked ? "Remove from Liked Songs" : "Like Song"}
                </Text>
              </Pressable>

              {/* Option 2: Play Next */}
              <Pressable
                onPress={handlePlayNext}
                className="py-3.5 px-3 rounded-2xl flex-row items-center active:bg-white/10 mb-1"
              >
                <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-emerald-500/15 border border-emerald-500/30">
                  <Icon name="play" size={20} color={theme.accent} />
                </View>
                <Text className="text-sm font-bold flex-1" style={{ color: theme.primaryText }}>
                  Play Next
                </Text>
              </Pressable>

              {/* Option 3: Add to Queue */}
              <Pressable
                onPress={handleAddToQueue}
                className="py-3.5 px-3 rounded-2xl flex-row items-center active:bg-white/10 mb-1"
              >
                <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-blue-500/15 border border-blue-500/30">
                  <Icon name="queue" size={20} color="#3B82F6" />
                </View>
                <Text className="text-sm font-bold flex-1" style={{ color: theme.primaryText }}>
                  Add to Queue
                </Text>
              </Pressable>

              {/* Option 4: Add to Playlist */}
              <Pressable
                onPress={() => setShowPlaylistPicker(true)}
                className="py-3.5 px-3 rounded-2xl flex-row items-center active:bg-white/10 mb-1"
              >
                <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-purple-500/15 border border-purple-500/30">
                  <Icon name="list" size={20} color="#A855F7" />
                </View>
                <Text className="text-sm font-bold flex-1" style={{ color: theme.primaryText }}>
                  Add to Playlist
                </Text>
                <Icon name="chevron-right" size={16} color={theme.mutedText} />
              </Pressable>

              {/* Option 5: Share Song */}
              <Pressable
                onPress={handleShare}
                className="py-3.5 px-3 rounded-2xl flex-row items-center active:bg-white/10 mb-2"
              >
                <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-amber-500/15 border border-amber-500/30">
                  <Icon name="share" size={20} color="#F59E0B" />
                </View>
                <Text className="text-sm font-bold flex-1" style={{ color: theme.primaryText }}>
                  Share Song
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
