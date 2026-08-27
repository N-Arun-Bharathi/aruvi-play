import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../utils/theme";
import { supabase } from "../../services/supabase";
import { dbSaveUser } from "../../services/sqlite";

export default function EditProfile() {
  const router = useRouter();
  const theme = useTheme();
  const userProfile = useAuthStore((s) => s.userProfile);

  const [name, setName] = useState(userProfile?.name || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function validateDisplayName(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Please enter your name.";
    }
    if (trimmed.length < 2) {
      return "Name must contain at least 2 characters.";
    }
    if (trimmed.length > 40) {
      return "Name cannot exceed 40 characters.";
    }
    // Block control characters and enforce basic name structures
    const hasControl = /[\u0000-\u001F\u007F-\u009F]/.test(trimmed);
    if (hasControl) {
      return "Name contains unsupported characters.";
    }
    return null;
  }

  const handleSave = async () => {
    const error = validateDisplayName(name);
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }

    if (!userProfile) return;
    setSaving(true);
    const prevName = userProfile.name;
    const optimisticProfile = {
      ...userProfile,
      id: userProfile.id || "00000000-0000-4000-a000-000000000000",
      name: name.trim(),
    };

    // Optimistic Update
    useAuthStore.setState({ userProfile: optimisticProfile });

    try {
      // 1. Update in Supabase
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userProfile.id);

      if (dbErr) throw dbErr;

      // 2. Save locally
      await dbSaveUser(optimisticProfile);
      await AsyncStorage.setItem("aruvi:user", JSON.stringify(optimisticProfile));

      Alert.alert("Success", "Profile updated successfully!");
      router.back();
    } catch (e: any) {
      // Rollback optimistic update
      const rolledBackProfile = {
        ...userProfile,
        name: prevName,
      };
      useAuthStore.setState({ userProfile: rolledBackProfile });
      Alert.alert("Failed to Save", e.message || "Failed to update profile name.");
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Denied", "We need library permissions to select an avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const selectedUri = result.assets[0].uri;
      
      setUploading(true);
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedUri,
          [{ resize: { width: 300, height: 300 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
        );

        await uploadAvatar(manipResult.uri);
      } catch (err) {
        Alert.alert("Error", "Could not process image.");
        setUploading(false);
      }
    }
  };

  const uploadAvatar = async (localUri: string) => {
    if (!userProfile) return;
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const filename = `${userProfile.id}/profile.webp`;
      
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(filename, blob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filename);

      const publicUrl = urlData.publicUrl;

      if (!userProfile) return;
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", userProfile.id);

      if (profileErr) throw profileErr;

      const updated = {
        ...userProfile,
        id: userProfile.id || "00000000-0000-4000-a000-000000000000",
        avatar_url: publicUrl,
      };
      useAuthStore.setState({ userProfile: updated });
      await dbSaveUser(updated);
      await AsyncStorage.setItem("aruvi:user", JSON.stringify(updated));

      Alert.alert("Success", "Avatar updated successfully!");
    } catch (e: any) {
      Alert.alert("Upload Failed", e.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!userProfile) return;
    Alert.alert(
      "Remove Avatar",
      "Are you sure you want to remove your profile photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setUploading(true);
            try {
              const { error: profileErr } = await supabase
                .from("profiles")
                .update({ avatar_url: null, updated_at: new Date().toISOString() })
                .eq("id", userProfile.id);

              if (profileErr) throw profileErr;

              const updated = {
                ...userProfile,
                id: userProfile.id || "00000000-0000-4000-a000-000000000000",
                avatar_url: null,
              };
              useAuthStore.setState({ userProfile: updated });
              await dbSaveUser(updated);
              await AsyncStorage.setItem("aruvi:user", JSON.stringify(updated));

              Alert.alert("Removed", "Profile photo has been removed.");
            } catch (e: any) {
              Alert.alert("Error", "Could not remove avatar.");
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader title="Edit Profile" showBack />
      
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Avatar Upload Frame */}
        <View className="items-center mb-8">
          <View className="relative">
            <ProfileAvatar size={100} />
            {uploading && (
              <View className="absolute inset-0 bg-black/60 items-center justify-center rounded-full">
                <ActivityIndicator color={theme.accent} />
              </View>
            )}
          </View>
          <View className="flex-row mt-4">
            <Pressable
              onPress={pickImage}
              disabled={uploading}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full active:bg-white/10 mr-2"
            >
              <Text className="text-xs font-bold" style={{ color: theme.accent }}>
                Change Photo
              </Text>
            </Pressable>
            {userProfile?.avatar_url && (
              <Pressable
                onPress={handleRemoveAvatar}
                disabled={uploading}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full active:bg-red-500/20"
              >
                <Text className="text-xs font-bold" style={{ color: theme.error }}>
                  Remove
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Display name field */}
        <View className="mb-8">
          <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.secondaryText }}>
            Display Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name (e.g. Arun Bharathi)"
            placeholderTextColor={theme.mutedText}
            className="px-4 py-3.5 rounded-2xl border text-base"
            style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.primaryText,
            }}
          />
          <Text className="text-[10px] mt-2 leading-relaxed" style={{ color: theme.mutedText }}>
            Name must be between 2 and 40 characters. Standard letters, spaces, and punctuation are permitted.
          </Text>
        </View>

        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          disabled={saving || uploading}
          loading={saving}
        />
      </ScrollView>
    </AppScreen>
  );
}
