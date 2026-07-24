import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, TextInput, Modal, KeyboardAvoidingView, Platform, FlatList, Share, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Icon } from "../../components/Icon";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { useScrollHandler } from "../../hooks/useScrollHandler";
import { useSettingsStore } from "../../store/settingsStore";
import { useRoomStore } from "../../store/roomStore";
import { DevPerformanceDashboard } from "../../components/DevPerformanceDashboard";
import { useAuthStore } from "../../store/authStore";

const REACTION_EMOJIS = ["❤️", "🔥", "👏", "😂", "🎉", "🚀"];

export default function ProfileScreen() {
  const likedLength = useLibraryStore((s) => s.liked.length);
  const recentLength = useLibraryStore((s) => s.recent.length);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const languages = useSettingsStore((s) => s.languages);
  const setLanguages = useSettingsStore((s) => s.setLanguages);
  const onScroll = useScrollHandler();

  // Settings states
  const [offlineMode, setOfflineMode] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Auth states
  const userProfile = useAuthStore((s) => s.userProfile);
  const elevateToAdmin = useAuthStore((s) => s.elevateToAdmin);
  const [adminKey, setAdminKey] = useState(userProfile?.is_owner ? "5868" : "");
  const [syncingLikes, setSyncingLikes] = useState(false);

  const handleAdminKeyChange = async (text: string) => {
    setAdminKey(text);
    if (text.trim() === "5868") {
      await elevateToAdmin("5868");
    } else if (userProfile?.is_owner && text.trim() === "") {
      await elevateToAdmin("");
    }
  };

  const handleAdminSync = async () => {
    if (!userProfile) return;
    setSyncingLikes(true);
    try {
      const { useLibraryStore } = require("../../store/likedStore");
      const { dbGetLikedSongs, dbRemoveLikedSong } = require("../../services/sqlite");
      const current = await dbGetLikedSongs(userProfile.id);
      for (const s of current) {
        await dbRemoveLikedSong(userProfile.id, s.id);
      }
      await useLibraryStore.getState().hydrate();
      const { useToastStore } = require("../../store/toastStore");
      useToastStore.getState().show("Admin liked list synced!");
    } catch (e) {
      console.error("Admin liked list sync error:", e);
    } finally {
      setSyncingLikes(false);
    }
  };

  // Room states
  const {
    roomCode,
    role,
    userId,
    users,
    messages,
    reactions,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendReaction,
    grantControl,
  } = useRoomStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  
  const [hostName, setHostName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [chatInput, setChatInput] = useState("");

  const handleAutoCreateRoom = async () => {
    try {
      const defaultHostName = userProfile?.name || "Aruvi User";
      await createRoom(defaultHostName);
    } catch (e) {
      console.error("Auto create room error:", e);
    }
  };

  const handleShareRoom = async () => {
    if (!roomCode) return;
    try {
      await Share.share({
        message: `Join my music room on Aruvi Play!\nRoom Code: ${roomCode}`,
      });
    } catch (e) {
      console.error("Share failed", e);
    }
  };

  const handleCreateRoom = async () => {
    if (!hostName.trim()) return;
    await createRoom(hostName);
    setCreateModalVisible(false);
    setHostName("");
  };

  const handleJoinRoom = async () => {
    if (!guestName.trim() || !inputCode.trim()) return;
    const success = await joinRoom(inputCode, guestName);
    if (success) {
      setJoinModalVisible(false);
      setGuestName("");
      setInputCode("");
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput("");
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      if (languages.length > 1) {
        setLanguages(languages.filter((l) => l !== lang));
      }
    } else {
      setLanguages([...languages, lang]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {roomCode ? (
        /* MUSIC ROOM ACTIVE DASHBOARD */
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/5 bg-surface/50">
            <View className="flex-row items-center flex-1 pr-4">
              <View>
                <Text className="text-accent text-[10px] uppercase font-bold tracking-widest">
                  Music Room Active
                </Text>
                <Text className="text-text text-2xl font-black mt-0.5">{roomCode}</Text>
              </View>
              <Pressable
                onPress={handleShareRoom}
                className="ml-4 p-2 bg-white/5 border border-white/10 rounded-full active:bg-white/10"
              >
                <Icon name="share" size={18} color="#1DB954" />
              </Pressable>
            </View>
            <Pressable
              onPress={leaveRoom}
              className="px-4 py-2 bg-destructive/20 border border-destructive/30 rounded-full active:bg-destructive/30"
            >
              <Text className="text-red-500 font-bold text-xs">Leave Room</Text>
            </Pressable>
          </View>

          <ScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            className="flex-1"
          >
            {/* Connection status */}
            <View className="mx-5 my-4 bg-accent/10 border border-accent/20 rounded-2xl p-3 flex-row items-center">
              <View className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse mr-2.5" />
              <Text className="text-accent text-xs font-bold">
                {role === "host" ? "You are hosting this room" : "Synchronized with host playback"}
              </Text>
            </View>

            {/* Users list */}
            <View className="px-5 mb-5">
              <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-2.5">
                Connected Members ({users.length})
              </Text>
              <View className="bg-surface rounded-2xl overflow-hidden border border-white/5">
                {users.map((user, idx) => (
                  <View
                    key={user.uid}
                    className={`flex-row items-center justify-between p-4 ${
                      idx < users.length - 1 ? "border-b border-white/5" : ""
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-surface2 items-center justify-center border border-white/10">
                        <Text className="text-text text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="ml-3">
                        <Text className="text-text font-semibold text-sm">
                          {user.name} {user.uid === userId ? "(You)" : ""}
                        </Text>
                        <Text className="text-muted text-[10px] capitalize font-medium">
                          {user.role} {user.canControl ? "• Control Granted" : ""}
                        </Text>
                      </View>
                    </View>

                    {/* Host Toggle to grant guest controls */}
                    {role === "host" && user.role !== "host" && (
                      <View className="flex-row items-center">
                        <Text className="text-[10px] text-muted mr-2 font-medium">Allow Control</Text>
                        <Switch
                          value={user.canControl}
                          onValueChange={(val) => grantControl(user.uid, val)}
                          trackColor={{ false: "#333", true: "#1DB954" }}
                          thumbColor="#FFF"
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Emoji Reactions Panel */}
            <View className="px-5 mb-5">
              <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-2.5">
                Send Live Reaction
              </Text>
              <View className="flex-row justify-between bg-surface rounded-2xl p-3.5 border border-white/5">
                {REACTION_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => sendReaction(emoji)}
                    className="p-2 bg-white/5 rounded-xl active:bg-white/15 active:scale-110 transition-all"
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Floating reactions list indicator */}
              {reactions.length > 0 && (
                <View className="flex-row justify-center mt-3 bg-white/5 py-2 rounded-xl">
                  <Text className="text-xs text-muted font-medium">Recent Reactions: </Text>
                  <Text className="text-xs font-bold">{reactions.slice(-6).join("  ")}</Text>
                </View>
              )}
            </View>

            {/* Room Chat Section */}
            <View className="px-5">
              <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-2.5">
                Room Chat
              </Text>
              <View className="bg-surface rounded-2xl border border-white/5 h-64 overflow-hidden justify-between">
                <ScrollView
                  contentContainerStyle={{ padding: 16 }}
                  ref={(ref) => ref?.scrollToEnd({ animated: true })}
                >
                  {messages.length === 0 ? (
                    <Text className="text-muted text-xs text-center mt-12">
                      No messages yet. Say hello!
                    </Text>
                  ) : (
                    messages.map((msg) => (
                      <View key={msg.id} className="mb-3.5">
                        <View className="flex-row items-center mb-0.5">
                          <Text className="text-accent text-[10px] font-bold">
                            {msg.sender}
                          </Text>
                          <Text className="text-muted/40 text-[8px] ml-2">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text className="text-text text-sm">{msg.text}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Chat input box */}
                <View className="flex-row items-center bg-surface2/60 border-t border-white/5 p-2">
                  <TextInput
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#7A7A7A"
                    className="flex-1 text-text text-xs px-3 py-2 bg-bg rounded-xl border border-white/5"
                    onSubmitEditing={handleSendMessage}
                  />
                  <Pressable
                    onPress={handleSendMessage}
                    className="ml-2 p-2 bg-accent rounded-xl active:opacity-80"
                  >
                    <Icon name="next" size={16} color="black" />
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* STANDARD SETTINGS & PROFILE VIEW */
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View className="items-center py-8 border-b border-white/5">
            <View className="w-24 h-24 rounded-full bg-surface2 overflow-hidden border border-white/10 items-center justify-center mb-4">
              <Icon name="profile" size={48} color="#A0A0A0" />
            </View>
            <Text className="text-text text-2xl font-bold">{userProfile?.name || "Aruvi User"}</Text>
            <Text className="text-muted text-sm mt-1">{userProfile?.phone || "Free Tier Sync Active"}</Text>
          </View>

          {/* Listen Stats */}
          <View className="px-5 mt-6">
            <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-3">
              Your Statistics
            </Text>
            <View className="flex-row justify-between bg-surface rounded-2xl p-4 border border-white/5">
              <View className="items-center flex-1">
                <Text className="text-text text-xl font-bold">{likedLength}</Text>
                <Text className="text-muted text-[10px] uppercase font-semibold mt-1">Liked</Text>
              </View>
              <View className="w-[1px] h-8 bg-white/10 my-auto" />
              <View className="items-center flex-1">
                <Text className="text-text text-xl font-bold">{recentLength}</Text>
                <Text className="text-muted text-[10px] uppercase font-semibold mt-1">Recents</Text>
              </View>
              <View className="w-[1px] h-8 bg-white/10 my-auto" />
              <View className="items-center flex-1">
                <Text className="text-text text-xl font-bold">{queueLength}</Text>
                <Text className="text-muted text-[10px] uppercase font-semibold mt-1">In Queue</Text>
              </View>
            </View>
          </View>

          {/* Shared Listening (Music Rooms Entry) */}
          <View className="px-5 mt-6">
            <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-3">
              Music Rooms (Shared listening)
            </Text>
            <View className="bg-surface rounded-2xl overflow-hidden border border-white/5">
              <Pressable
                onPress={handleAutoCreateRoom}
                className="flex-row items-center justify-between p-4 border-b border-white/5 active:bg-white/5"
              >
                <View className="flex-row items-center">
                  <Icon name="plus" size={20} color="#1DB954" />
                  <Text className="text-text font-semibold ml-3">Create Shared Room</Text>
                </View>
                <Icon name="next" size={16} color="#A0A0A0" />
              </Pressable>
              <Pressable
                onPress={() => setJoinModalVisible(true)}
                className="flex-row items-center justify-between p-4 active:bg-white/5"
              >
                <View className="flex-row items-center">
                  <Icon name="search" size={20} color="#1DB954" />
                  <Text className="text-text font-semibold ml-3">Join Room with Code</Text>
                </View>
                <Icon name="next" size={16} color="#A0A0A0" />
              </Pressable>
            </View>
          </View>

          {/* Languages Preferenced */}
          <View className="px-5 mt-6">
            <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-3">
              Preferred Languages
            </Text>
            <View className="bg-surface rounded-2xl p-4 border border-white/5 flex-row">
              {["tamil", "english", "hindi"].map((lang) => {
                const active = languages.includes(lang);
                return (
                  <Pressable
                    key={lang}
                    onPress={() => toggleLanguage(lang)}
                    className={`flex-1 py-2 px-1 rounded-xl items-center border ${
                      active ? "bg-accent border-accent" : "bg-surface2 border-white/10"
                    }`}
                    style={{ marginRight: lang === "hindi" ? 0 : 8 }}
                  >
                    <Text
                      style={{ fontWeight: "600" }}
                      className={`text-xs capitalize ${active ? "text-black" : "text-text"}`}
                    >
                      {lang}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* App Settings */}
          <View className="px-5 mt-6">
            <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-3">
              App Settings
            </Text>
            <View className="bg-surface rounded-2xl overflow-hidden border border-white/5">
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center flex-1 pr-4">
                  <Icon name="lock" size={20} color="#A0A0A0" />
                  <TextInput
                    value={adminKey}
                    onChangeText={handleAdminKeyChange}
                    placeholder="Enter Admin Access Key"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    secureTextEntry
                    className="text-text text-sm ml-3 flex-1 py-1"
                  />
                </View>
                {userProfile?.is_owner && (
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={handleAdminSync}
                      disabled={syncingLikes}
                      className="mr-3 px-3 py-1.5 bg-accent rounded-xl active:bg-accent/80 flex-row items-center justify-center"
                    >
                      {syncingLikes ? (
                        <ActivityIndicator size="small" color="#000000" style={{ width: 12, height: 12 }} />
                      ) : (
                        <Text className="text-black text-[10px] font-extrabold uppercase">Sync</Text>
                      )}
                    </Pressable>
                    <View className="bg-accent/15 px-2.5 py-1 rounded-full border border-accent/20">
                      <Text className="text-accent text-[9px] font-extrabold uppercase tracking-widest">Admin</Text>
                    </View>
                  </View>
                )}
              </View>
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center">
                  <Icon name="folder" size={20} color="#A0A0A0" />
                  <Text className="text-text font-medium ml-3">Offline Cache Only</Text>
                </View>
                <Switch
                  value={offlineMode}
                  onValueChange={setOfflineMode}
                  trackColor={{ false: "#333", true: "#1DB954" }}
                  thumbColor="#FFF"
                />
              </View>
              <View className="flex-row items-center justify-between p-4 border-b border-white/5">
                <View className="flex-row items-center">
                  <Icon name="clock" size={20} color="#A0A0A0" />
                  <Text className="text-text font-medium ml-3">Haptic Feedback</Text>
                </View>
                <Switch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                  trackColor={{ false: "#333", true: "#1DB954" }}
                  thumbColor="#FFF"
                />
              </View>
              <Pressable
                onPress={() => {
                  const { runUpdateCheckFlow } = require("../../services/updatesService");
                  runUpdateCheckFlow(true).catch(() => {});
                }}
                className="flex-row items-center justify-between p-4 active:bg-white/5"
              >
                <View className="flex-row items-center">
                  <Icon name="search" size={20} color="#A0A0A0" />
                  <Text className="text-text font-medium ml-3">Check for Updates</Text>
                </View>
                <Icon name="next" size={16} color="#A0A0A0" />
              </Pressable>
            </View>
          </View>

          {__DEV__ && (
            <View className="px-5 mt-6">
              <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-3">
                Developer Performance Panel
              </Text>
              <DevPerformanceDashboard />
            </View>
          )}

          <Text className="text-center text-muted/40 text-[10px] mt-8 font-medium">
            Aruvi Play v1.1.0 • Made with ❤️
          </Text>
        </ScrollView>
      )}

      {/* CREATE ROOM MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <BlurView intensity={90} tint="dark" className="h-[45%] rounded-t-[32px] p-6 border-t border-white/10">
            <Text className="text-text text-xl font-bold mb-4">Create Music Room</Text>
            <Text className="text-muted text-xs mb-4">
              Enter your host name to start a shared listening session. You will control the playback queue.
            </Text>
            <TextInput
              value={hostName}
              onChangeText={setHostName}
              placeholder="Your Nickname (e.g. DJ Arun)"
              placeholderTextColor="#7A7A7A"
              className="text-text text-sm p-4 bg-white/5 border border-white/10 rounded-2xl mb-6"
              autoFocus
            />
            <View className="flex-row justify-between">
              <Pressable
                onPress={() => setCreateModalVisible(false)}
                className="flex-1 mr-2 py-4 bg-white/10 rounded-2xl items-center"
              >
                <Text className="text-text font-bold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateRoom}
                className="flex-1 ml-2 py-4 bg-accent rounded-2xl items-center"
              >
                <Text className="text-black font-bold">Create Room</Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* JOIN ROOM MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={joinModalVisible}
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <BlurView intensity={90} tint="dark" className="h-[55%] rounded-t-[32px] p-6 border-t border-white/10">
            <Text className="text-text text-xl font-bold mb-4">Join Music Room</Text>
            <Text className="text-muted text-xs mb-4">
              Enter the 6-character room code and your nickname to sync your playback.
            </Text>
            <TextInput
              value={inputCode}
              onChangeText={setInputCode}
              placeholder="Room Code (e.g. PLAY82)"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="characters"
              maxLength={6}
              className="text-text text-sm p-4 bg-white/5 border border-white/10 rounded-2xl mb-4"
              autoFocus
            />
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Your Nickname (e.g. Arun)"
              placeholderTextColor="#7A7A7A"
              className="text-text text-sm p-4 bg-white/5 border border-white/10 rounded-2xl mb-6"
            />
            <View className="flex-row justify-between">
              <Pressable
                onPress={() => setJoinModalVisible(false)}
                className="flex-1 mr-2 py-4 bg-white/10 rounded-2xl items-center"
              >
                <Text className="text-text font-bold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleJoinRoom}
                className="flex-1 ml-2 py-4 bg-accent rounded-2xl items-center"
              >
                <Text className="text-black font-bold">Join Room</Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
