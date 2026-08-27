import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { Icon } from "../../components/Icon";
import { useTheme } from "../../utils/theme";
import { usePlayerStore } from "../../store/playerStore";
import { useRoomStore } from "../../store/roomStore";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "expo-router";

export default function RoomsTabScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currentSong = usePlayerStore((s) => s.current);
  const bottomPadding = currentSong ? 210 : 150;

  const {
    activeRooms,
    currentRoom,
    loading,
    fetchActiveRooms,
    createRoom,
    joinRoomByCode,
    leaveRoom,
  } = useRoomStore();

  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    const roomId = await createRoom(roomName);
    if (roomId) {
      setRoomName("");
      setShowCreateModal(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    const success = await joinRoomByCode(joinCode);
    if (success) {
      setJoinCode("");
    }
  };

  const authMode = useAuthStore((s) => s.authMode);

  // Deep-link guard: guests cannot access rooms even if they arrive here
  if (authMode !== "authenticated") {
    return (
      <AppScreen edges={["top"]}>
        <AppHeader title="Music Rooms" />
        <View className="flex-1 items-center justify-center px-8">
          <Icon name="room" size={56} color="#3F3F46" />
          <Text className="text-lg font-bold mt-5 mb-2 text-center" style={{ color: theme.primaryText }}>
            Sign in to join rooms
          </Text>
          <Text className="text-sm text-center leading-relaxed mb-8" style={{ color: theme.secondaryText }}>
            Sign in to create or join a music room.
          </Text>
          <Pressable
            onPress={() => router.replace("/auth" as any)}
            className="px-8 py-3.5 rounded-2xl bg-accent active:opacity-80"
          >
            <Text className="text-black font-extrabold text-sm">Sign In</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen edges={["top"]}>
      <AppHeader title="Music Rooms" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Connected Room Banner */}
        {currentRoom ? (
          <View
            className="p-5 rounded-3xl border mb-6"
            style={{ backgroundColor: theme.card, borderColor: theme.accent }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Icon name="room" size={22} color={theme.accent} />
                <Text className="text-lg font-bold ml-2" style={{ color: theme.primaryText }}>
                  {currentRoom.name}
                </Text>
              </View>
              <View className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <Text className="text-xs font-bold text-emerald-400">ACTIVE</Text>
              </View>
            </View>

            <Text className="text-xs mb-3" style={{ color: theme.secondaryText }}>
              Host: <Text className="font-semibold">{currentRoom.host_name}</Text> • Room Code:{" "}
              <Text className="font-mono font-bold tracking-widest" style={{ color: theme.accent }}>
                {currentRoom.code}
              </Text>
            </Text>

            <Pressable
              onPress={leaveRoom}
              className="py-2.5 px-4 rounded-xl border border-red-500/30 bg-red-500/10 items-center justify-center flex-row"
            >
              <Icon name="close" size={16} color="#EF4444" />
              <Text className="text-red-400 font-bold text-xs ml-2">Leave Room Session</Text>
            </Pressable>
          </View>
        ) : (
          /* Join by Code Card */
          <View
            className="p-5 rounded-3xl border mb-6"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Text className="text-base font-bold mb-1" style={{ color: theme.primaryText }}>
              Join a Music Room
            </Text>
            <Text className="text-xs mb-4" style={{ color: theme.secondaryText }}>
              Enter a 6-character room code to listen together in real-time.
            </Text>

            <View className="flex-row items-center space-x-2">
              <TextInput
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                placeholder="Enter Code (e.g. AB12CD)"
                placeholderTextColor={theme.mutedText}
                maxLength={6}
                autoCapitalize="characters"
                className="flex-1 px-4 py-3 rounded-2xl border text-sm font-mono tracking-widest uppercase"
                style={{
                  backgroundColor: theme.elevatedSurface,
                  borderColor: theme.border,
                  color: theme.primaryText,
                }}
              />
              <Pressable
                onPress={handleJoin}
                disabled={loading}
                className="px-5 py-3.5 rounded-2xl bg-accent items-center justify-center"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text className="text-black font-extrabold text-sm">Join</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Create Room Button */}
        <Pressable
          onPress={() => setShowCreateModal(true)}
          className="p-4 rounded-2xl bg-accent active:bg-accent/85 flex-row items-center justify-center mb-6 shadow-lg"
        >
          <Icon name="plus" size={18} color="#000000" />
          <Text className="text-black font-extrabold text-sm ml-2">Create New Music Room</Text>
        </Pressable>

        {/* Active Public Rooms Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-extrabold" style={{ color: theme.primaryText }}>
            Active Music Rooms
          </Text>
          <Pressable onPress={fetchActiveRooms} className="p-2">
            <Icon name="shuffle" size={16} color={theme.secondaryText} />
          </Pressable>
        </View>

        {/* Active Rooms List */}
        {loading && activeRooms.length === 0 ? (
          <ActivityIndicator color={theme.accent} size="large" className="my-8" />
        ) : activeRooms.length === 0 ? (
          <View
            className="p-8 rounded-3xl border items-center justify-center my-2"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Icon name="room" size={36} color={theme.mutedText} />
            <Text className="text-base font-bold mt-3 mb-1" style={{ color: theme.primaryText }}>
              No Active Rooms
            </Text>
            <Text className="text-xs text-center leading-relaxed" style={{ color: theme.secondaryText }}>
              Be the first to create a room and invite your friends to listen together!
            </Text>
          </View>
        ) : (
          activeRooms.map((room) => (
            <View
              key={room.id}
              className="p-4 rounded-2xl border mb-3 flex-row items-center justify-between"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <View className="flex-1 mr-3">
                <Text className="text-base font-bold mb-0.5" style={{ color: theme.primaryText }}>
                  {room.name}
                </Text>
                <Text className="text-xs" style={{ color: theme.secondaryText }}>
                  Host: {room.host_name} • Code:{" "}
                  <Text className="font-mono font-bold" style={{ color: theme.accent }}>
                    {room.code}
                  </Text>
                </Text>
              </View>

              <Pressable
                onPress={() => joinRoomByCode(room.code)}
                className="px-4 py-2 rounded-xl bg-white/10 active:bg-white/20 border border-white/10"
              >
                <Text className="text-white font-bold text-xs">Join</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Room Modal */}
      {showCreateModal && (
        <View className="absolute inset-0 bg-black/80 justify-center px-6 z-50">
          <View
            className="p-6 rounded-3xl border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Text className="text-lg font-bold mb-1" style={{ color: theme.primaryText }}>
              Create Music Room
            </Text>
            <Text className="text-xs mb-4" style={{ color: theme.secondaryText }}>
              Give your music room a unique name for your session listeners.
            </Text>

            <TextInput
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Enter room name (e.g. Tamil Hits Party)"
              placeholderTextColor={theme.mutedText}
              className="px-4 py-3 rounded-2xl border text-sm mb-5"
              style={{
                backgroundColor: theme.elevatedSurface,
                borderColor: theme.border,
                color: theme.primaryText,
              }}
            />

            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setShowCreateModal(false)}
                className="flex-1 py-3.5 rounded-2xl bg-white/10 items-center"
              >
                <Text className="text-white font-bold text-sm">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl bg-accent items-center"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text className="text-black font-extrabold text-sm">Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </AppScreen>
  );
}
