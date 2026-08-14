import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../utils/theme";
import { useAuthStore } from "../../store/authStore";
import { dbSavePlaylist } from "../../services/sqlite";
import { supabase } from "../../services/supabase";
import { useToastStore } from "../../store/toastStore";

export default function CreatePlaylist() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore((s) => s.userProfile);
  const toast = useToastStore();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.show("Please enter a playlist name.");
      return;
    }

    setLoading(true);
    const rawUserId = user?.id;
    const isGuest = !rawUserId || user?.is_guest || rawUserId.startsWith("guest");
    const playlistId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pl-${Date.now()}`;

    try {
      let savedServer = false;
      const { data: authData } = await supabase.auth.getUser();
      const currentAuthId = authData?.user?.id;

      if (currentAuthId && !isGuest) {
        try {
          const { data: pl, error } = await supabase
            .from("playlists")
            .insert({
              user_id: currentAuthId,
              name: cleanName,
              description: desc.trim(),
              is_public: true, // Visible for all users
            })
            .select()
            .single();

          if (!error && pl) {
            await dbSavePlaylist({
              id: pl.id,
              userId: pl.user_id,
              name: pl.name,
              description: pl.description,
              isPublic: true,
            });
            savedServer = true;
          }
        } catch (serverErr) {
          console.warn("Server playlist creation fallback:", serverErr);
        }
      }

      if (!savedServer) {
        await dbSavePlaylist({
          id: playlistId,
          userId: rawUserId || "guest-user",
          name: cleanName,
          description: desc.trim(),
          isPublic: true,
        });
      }

      toast.show(`Playlist "${cleanName}" created!`);
      router.back();
    } catch (e: any) {
      console.error("Create playlist error:", e);
      toast.show(e.message || "Failed to create playlist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader title="Create Playlist" showBack />
      <View className="flex-1 p-6" style={{ backgroundColor: theme.background }}>
        <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.secondaryText }}>
          Playlist Name *
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. My Favourite Hits"
          placeholderTextColor={theme.mutedText}
          className="px-4 py-3.5 rounded-2xl border mb-5 text-base"
          style={{
            backgroundColor: theme.card,
            borderColor: theme.border,
            color: theme.primaryText,
          }}
        />

        <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.secondaryText }}>
          Description
        </Text>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Add an optional description"
          placeholderTextColor={theme.mutedText}
          multiline
          numberOfLines={3}
          className="px-4 py-3.5 rounded-2xl border mb-8 text-base h-24 text-top"
          style={{
            backgroundColor: theme.card,
            borderColor: theme.border,
            color: theme.primaryText,
            textAlignVertical: "top",
          }}
        />

        <PrimaryButton
          title="Create Playlist"
          onPress={handleCreate}
          disabled={!name.trim()}
          loading={loading}
        />
      </View>
    </AppScreen>
  );
}
