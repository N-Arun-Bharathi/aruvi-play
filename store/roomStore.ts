import { create } from "zustand";
import { Song } from "../types/song";
import { supabase } from "../services/supabase";
import { QueueManager } from "../services/queueManager";
import { usePlayerStore } from "./playerStore";
import { useToastStore } from "./toastStore";
import { useAuthStore } from "./authStore";
import { tryGetPlayer } from "../services/trackPlayer";
import { dbSaveUser } from "../services/sqlite";

interface UserProfile {
  uid: string;
  name: string;
  role: "host" | "guest";
  canControl: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface RoomState {
  roomCode: string | null;
  roomId: string | null;
  role: "host" | "guest" | null;
  userId: string | null;
  userName: string;
  users: UserProfile[];
  messages: ChatMessage[];
  reactions: string[];
  isConnected: boolean;
  isConnecting: boolean;

  createRoom: (name: string) => Promise<string>;
  joinRoom: (code: string, name: string) => Promise<boolean>;
  leaveRoom: () => void;
  sendMessage: (text: string) => void;
  sendReaction: (emoji: string) => void;
  setUserName: (name: string) => void;
  grantControl: (uid: string, granted: boolean) => void;
}

let activeChannel: any = null;
let membersSubscription: any = null;
let lastSyncWrite = 0;
let isOfflineMockMode = false;

/**
 * Synchronizes the local SQLite database and Zustand store with the active Supabase session
 */
async function syncLocalProfile(userId: string, displayName: string) {
  try {
    await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName,
      phone: null,
      email: null,
    });
  } catch (err) {
    console.warn("Failed to provision profile row natively:", err);
  }

  const currentUser = useAuthStore.getState().userProfile;
  if (!currentUser || currentUser.id !== userId) {
    const updatedProfile = {
      id: userId,
      name: displayName,
      is_owner: currentUser?.is_owner || false,
      initial_likes_imported: currentUser?.initial_likes_imported || false,
    };
    useAuthStore.setState({ authenticated: true, userProfile: updatedProfile });
    await dbSaveUser(updatedProfile).catch(() => {});
  }
}

/**
 * Ensures a valid Supabase session is active before performing database calls.
 * If credentials in .env are invalid or offline, sets isOfflineMockMode to true.
 */
async function ensureSupabaseSession(displayName: string): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await syncLocalProfile(session.user.id, displayName);
      isOfflineMockMode = false;
      return session.user.id;
    }
  } catch (e) {}

  console.log("RoomStore: No active session. Trying silent anonymous sign-in...");
  
  // Strategy 1: Anonymous Login
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data.session?.user?.id) {
      const userId = data.session.user.id;
      await syncLocalProfile(userId, displayName);
      isOfflineMockMode = false;
      return userId;
    }
  } catch (e) {
    console.warn("Anonymous sign-in exception:", e);
  }

  console.log("RoomStore: Anonymous sign-in failed/disabled. Trying silent email login fallback...");

  // Strategy 2: Silent email registration fallback
  try {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const email = `guest-${randomSuffix}@aruvi-play.com`;
    const password = `aruvi-temp-${randomSuffix}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: displayName }
      }
    });

    if (!error && data.session?.user?.id) {
      const userId = data.session.user.id;
      await syncLocalProfile(userId, displayName);
      isOfflineMockMode = false;
      return userId;
    }
  } catch (e) {
    console.warn("Email signup fallback exception:", e);
  }

  // Final Fallback: Set local offline mock flag so room works offline/without credentials
  console.warn("RoomStore: Supabase connection offline. Enabling Local Mock Room Mode...");
  isOfflineMockMode = true;
  return "offline-mock-user-id-5868";
}

export const useRoomStore = create<RoomState>((set, get) => ({
  roomCode: null,
  roomId: null,
  role: null,
  userId: null,
  userName: "User" + Math.floor(100 + Math.random() * 900),
  users: [],
  messages: [],
  reactions: [],
  isConnected: false,
  isConnecting: false,

  setUserName: (name) => set({ userName: name }),

  createRoom: async (name) => {
    set({ isConnecting: true });
    const toast = useToastStore.getState();

    try {
      // 1. Resolve UUID
      const userId = await ensureSupabaseSession(name);

      // Generate random 6 character code
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      if (isOfflineMockMode) {
        set({
          roomCode: code,
          roomId: "mock-room-id-5868",
          role: "host",
          userId,
          userName: name,
          users: [
            {
              uid: userId,
              name: name,
              role: "host",
              canControl: true
            }
          ],
          isConnected: true,
          isConnecting: false,
        });
        toast.show(`Mock Room Created: ${code} (Local Mode)`);
        return code;
      }

      // 2. Insert room row (online mode)
      const { data: room, error: rError } = await supabase
        .from("rooms")
        .insert({
          room_code: code,
          host_user_id: userId,
          playback_state: "paused",
          playback_position: 0,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (rError) throw rError;

      // 3. Insert host member entry
      const { error: mError } = await supabase
        .from("room_members")
        .insert({
          room_id: room.id,
          user_id: userId,
          role: "host"
        });

      if (mError) throw mError;

      set({
        roomCode: code,
        roomId: room.id,
        role: "host",
        userId,
        userName: name,
        isConnected: true,
        isConnecting: false,
      });

      // Join the real-time broadcast and postgres channels
      await get().joinRoom(code, name);
      toast.show(`Room Created: ${code}`);
      return code;
    } catch (err: any) {
      console.error("Failed to create room:", err);
      toast.show(err.message || "Failed to create music room.");
      set({ isConnecting: false });
      return "";
    }
  },

  joinRoom: async (code, name) => {
    set({ isConnecting: true });
    const toast = useToastStore.getState();
    const cleanCode = code.toUpperCase().trim();

    try {
      // 1. Resolve UUID
      const userId = await ensureSupabaseSession(name);

      if (isOfflineMockMode) {
        set({
          roomCode: cleanCode,
          roomId: "mock-room-id-5868",
          role: "guest",
          userId,
          userName: name,
          users: [
            {
              uid: "mock-host-id-999",
              name: "Aruvi Host",
              role: "host",
              canControl: true
            },
            {
              uid: userId,
              name: name,
              role: "guest",
              canControl: false
            }
          ],
          isConnected: true,
          isConnecting: false,
        });
        toast.show(`Joined Mock Room: ${cleanCode} (Local Mode)`);
        return true;
      }

      // 2. Fetch Room Details
      const { data: room, error: roomErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", cleanCode)
        .single();

      if (roomErr || !room) {
        throw new Error("Music Room not found.");
      }

      if (new Date(room.expires_at).getTime() < Date.now()) {
        throw new Error("Music Room has expired.");
      }

      // 3. Upsert self into room members list
      const { error: memberErr } = await supabase
        .from("room_members")
        .upsert({
          room_id: room.id,
          user_id: userId,
          role: room.host_user_id === userId ? "host" : "guest",
          last_seen_at: new Date().toISOString()
        });

      if (memberErr) throw memberErr;

      if (activeChannel) {
        activeChannel.unsubscribe();
        activeChannel = null;
      }
      if (membersSubscription) {
        membersSubscription.unsubscribe();
        membersSubscription = null;
      }

      // 4. Setup postgres presence change subscription
      membersSubscription = supabase
        .channel(`room_members:${room.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_members",
            filter: `room_id=eq.${room.id}`
          },
          async () => {
            const { data: members } = await supabase
              .from("room_members")
              .select("user_id, role, profiles(display_name)")
              .eq("room_id", room.id);

            if (members) {
              const formattedUsers: UserProfile[] = members.map((m: any) => ({
                uid: m.user_id,
                name: m.profiles?.display_name || "Room Member",
                role: m.role,
                canControl: m.role === "host"
              }));
              set({ users: formattedUsers });
            }
          }
        )
        .subscribe();

      const { data: initialMembers } = await supabase
        .from("room_members")
        .select("user_id, role, profiles(display_name)")
        .eq("room_id", room.id);

      if (initialMembers) {
        const formattedUsers: UserProfile[] = initialMembers.map((m: any) => ({
          uid: m.user_id,
          name: m.profiles?.display_name || "Room Member",
          role: m.role,
          canControl: m.role === "host"
        }));
        set({ users: formattedUsers });
      }

      // 5. Setup Broadcast Channel
      activeChannel = supabase.channel(`room_broadcast:${cleanCode}`, {
        config: {
          broadcast: { self: false }
        }
      });

      activeChannel
        .on("broadcast", { event: "playback" }, ({ payload }: any) => {
          const role = get().role;
          if (role === "guest") {
            const manager = QueueManager.getInstance();
            const player = tryGetPlayer();

            if (JSON.stringify(manager.queue) !== JSON.stringify(payload.queue)) {
              manager.queue = payload.queue || [];
            }

            if (manager.index !== payload.index) {
              manager.index = payload.index;
              if (payload.index >= 0 && payload.index < manager.queue.length) {
                const song = manager.queue[payload.index];
                const currentLocal = manager.index >= 0 ? manager.queue[manager.index] : null;
                if (!currentLocal || currentLocal.id !== song.id) {
                  manager.playSong(song, manager.queue);
                }
              }
            }

            if (player) {
              if (payload.isPlaying && !player.playing) {
                player.play();
                manager.isPlaying = true;
              } else if (!payload.isPlaying && player.playing) {
                player.pause();
                manager.isPlaying = false;
              }
            }

            if (player && payload.position !== undefined) {
              const latency = (Date.now() - payload.timestamp) / 1000;
              const targetPos = payload.position + latency;
              const diff = Math.abs(player.currentTime - targetPos);
              if (diff > 3.0) {
                player.seekTo(targetPos);
              }
            }

            usePlayerStore.setState({
              queue: manager.queue,
              index: manager.index,
              current: manager.index >= 0 ? manager.queue[manager.index] : null,
              isPlaying: manager.isPlaying,
            });
          }
        })
        .on("broadcast", { event: "chat" }, ({ payload }: any) => {
          set((state) => ({ messages: [...state.messages, payload] }));
        })
        .on("broadcast", { event: "reaction" }, ({ payload }: any) => {
          set((state) => ({ reactions: [...state.reactions.slice(-10), payload] }));
        });

      await activeChannel.subscribe();

      set({
        roomCode: cleanCode,
        roomId: room.id,
        role: room.host_user_id === userId ? "host" : "guest",
        userId,
        userName: name,
        isConnected: true,
        isConnecting: false,
      });

      toast.show(`Joined Room: ${cleanCode}`);
      return true;
    } catch (err: any) {
      console.error("Join Room Failed:", err);
      toast.show(err.message || "Failed to join room.");
      set({ isConnecting: false });
      return false;
    }
  },

  leaveRoom: () => {
    const { roomCode, roomId, userId } = get();
    const toast = useToastStore.getState();

    if (activeChannel) {
      activeChannel.unsubscribe();
      activeChannel = null;
    }
    if (membersSubscription) {
      membersSubscription.unsubscribe();
      membersSubscription = null;
    }

    if (!isOfflineMockMode && roomId && userId) {
      supabase
        .from("room_members")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .then(() => {});
    }

    set({
      roomCode: null,
      roomId: null,
      role: null,
      users: [],
      messages: [],
      reactions: [],
      isConnected: false,
    });
    
    toast.show("Left Room");
  },

  sendMessage: (text) => {
    const { roomCode, userName } = get();
    if (!roomCode || !text.trim()) return;

    const payload: ChatMessage = {
      id: Math.random().toString(),
      sender: userName,
      text: text.trim(),
      timestamp: Date.now()
    };

    if (activeChannel) {
      activeChannel.send({
        type: "broadcast",
        event: "chat",
        payload
      });
    }

    set((state) => ({ messages: [...state.messages, payload] }));
  },

  sendReaction: (emoji) => {
    const { roomCode } = get();
    if (!roomCode) return;

    if (activeChannel) {
      activeChannel.send({
        type: "broadcast",
        event: "reaction",
        payload: emoji
      });
    }

    set((state) => ({ reactions: [...state.reactions.slice(-10), emoji] }));
  },

  grantControl: (uid, granted) => {
    // Legacy support
  }
}));

export function syncPlaybackWithRoom() {
  const { roomCode, role, isConnected } = useRoomStore.getState();
  if (!roomCode || !isConnected || isOfflineMockMode || !activeChannel) return;

  if (role === "host") {
    const now = Date.now();
    if (now - lastSyncWrite < 1500) return;
    lastSyncWrite = now;

    const manager = QueueManager.getInstance();
    const player = tryGetPlayer();

    activeChannel.send({
      type: "broadcast",
      event: "playback",
      payload: {
        queue: manager.queue,
        index: manager.index,
        isPlaying: manager.isPlaying,
        position: player ? player.currentTime : 0,
        timestamp: now,
      }
    });
  }
}
