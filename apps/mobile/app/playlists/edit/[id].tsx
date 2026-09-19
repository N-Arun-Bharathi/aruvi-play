import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppScreen } from "../../../components/AppScreen";
import { AppHeader } from "../../../components/AppHeader";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { useTheme } from "../../../utils/theme";
import { dbSavePlaylist, dbGetPlaylists } from "../../../services/sqlite";
import { supabase } from "../../../services/supabase";

export default function EditPlaylist() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlaylist();
    }
  }, [id]);

  const loadPlaylist = async () => {
    try {
      const cached = (await dbGetPlaylists("guest-user")) || [];
      const localPl = cached.find((p: any) => p.id === id);
      if (localPl) {
        setName(localPl.name);
        setDesc(localPl.description || "");
      }

      const { data: pl, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (pl) {
        setName(pl.name);
        setDesc(pl.description || "");
        await dbSavePlaylist({
          id: pl.id,
          userId: pl.user_id || "guest-user",
          name: pl.name,
          description: pl.description,
          coverImage: pl.cover_url,
          isPublic: !!pl.is_public,
        });
      }
    } catch (e) {
      console.warn("Failed to load playlist", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Playlist name is required.");
      return;
    }

    setSaving(true);
    try {
      await dbSavePlaylist({
        id,
        userId: "guest-user",
        name: name.trim(),
        description: desc.trim(),
        isPublic: true,
      });

      try {
        const { data: pl, error } = await supabase
          .from("playlists")
          .update({
            name: name.trim(),
            description: desc.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .maybeSingle();

        if (pl) {
          await dbSavePlaylist({
            id: pl.id,
            userId: pl.user_id || "guest-user",
            name: pl.name,
            description: pl.description,
            coverImage: pl.cover_url,
            isPublic: !!pl.is_public,
          });
        }
      } catch (serverErr) {
        console.warn("Server playlist update warning:", serverErr);
      }

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update playlist");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen edges={["top", "bottom"]}>
        <AppHeader title="Edit Playlist" showBack />
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader title="Edit Playlist Details" showBack />
      <View className="flex-1 p-6" style={{ backgroundColor: theme.background }}>
        <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.secondaryText }}>
          Playlist Name *
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Playlist name"
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
          placeholder="Add description"
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
          title="Save Details"
          onPress={handleSave}
          disabled={!name.trim()}
          loading={saving}
        />
      </View>
    </AppScreen>
  );
}
