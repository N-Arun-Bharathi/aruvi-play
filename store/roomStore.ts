import { create } from "zustand";
import { Song, RepeatMode } from "../types/song";
import { generateRoomCode, database, auth, useMock } from "../services/firebase";
import { signInAnonymously } from "firebase/auth";
import { ref, set as firebaseSet, onValue, push as firebasePush, update as firebaseUpdate, remove as firebaseRemove, off, DatabaseReference } from "firebase/database";
import { QueueManager } from "../services/queueManager";
import { usePlayerStore } from "./playerStore";
import { useToastStore } from "./toastStore";
import { tryGetPlayer } from "../services/trackPlayer";

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

let playbackListener: any = null;
let usersListener: any = null;
let chatListener: any = null;
let reactionListener: any = null;
let lastSyncWrite = 0;

export const useRoomStore = create<RoomState>((set, get) => ({
  roomCode: null,
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
    const code = generateRoomCode();
    let uid = "mock-host-uid";

    if (!useMock && auth && database) {
      try {
        const userCredential = await signInAnonymously(auth);
        uid = userCredential.user.uid;
      } catch (err) {
        console.error("Firebase auth failed, falling back to mock", err);
      }
    }

    const hostProfile: UserProfile = {
      uid,
      name,
      role: "host",
      canControl: true,
    };

    const manager = QueueManager.getInstance();
    const playbackState = {
      currentSong: manager.index >= 0 ? manager.queue[manager.index] : null,
      queue: manager.queue,
      index: manager.index,
      isPlaying: manager.isPlaying,
      position: 0,
      shuffle: false,
      repeat: "off" as RepeatMode,
      timestamp: Date.now(),
    };

    if (!useMock && database) {
      await firebaseSet(ref(database, `rooms/${code}`), {
        hostId: uid,
        playback: playbackState,
        users: { [uid]: hostProfile },
      });
    }

    set({
      roomCode: code,
      role: "host",
      userId: uid,
      userName: name,
      users: [hostProfile],
      isConnected: true,
      isConnecting: false,
    });

    // Start listening
    get().joinRoom(code, name);
    useToastStore.getState().show(`Room Created: ${code}`);
    return code;
  },

  joinRoom: async (code, name) => {
    set({ isConnecting: true });
    const cleanCode = code.toUpperCase().trim();
    let uid = "mock-guest-" + Math.floor(Math.random() * 1000);

    if (!useMock && auth && database) {
      try {
        const userCredential = await signInAnonymously(auth);
        uid = userCredential.user.uid;
      } catch (err) {
        console.error("Firebase auth failed", err);
      }
    }

    // Clean up previous listeners if switching rooms
    const oldCode = get().roomCode;
    if (!useMock && database && oldCode) {
      if (playbackListener) off(ref(database, `rooms/${oldCode}/playback`));
      if (usersListener) off(ref(database, `rooms/${oldCode}/users`));
      if (chatListener) off(ref(database, `rooms/${oldCode}/chat`));
      if (reactionListener) off(ref(database, `rooms/${oldCode}/reactions`));
      playbackListener = null;
      usersListener = null;
      chatListener = null;
      reactionListener = null;
    }

    // Connect listener to playback
    if (!useMock && database) {
      const roomRef = ref(database, `rooms/${cleanCode}`);
      
      // Verify room exists
      let roomExists = false;
      await new Promise<void>((resolve) => {
        onValue(roomRef, (snapshot) => {
          roomExists = snapshot.exists();
          resolve();
        }, { onlyOnce: true });
      });

      if (!roomExists) {
        set({ isConnecting: false });
        useToastStore.getState().show("Room not found!");
        return false;
      }

      // Add user to room
      const userRef = ref(database, `rooms/${cleanCode}/users/${uid}`);
      const myProfile: UserProfile = {
        uid,
        name,
        role: get().role || "guest",
        canControl: get().role === "host",
      };
      await firebaseSet(userRef, myProfile);

      // Setup Listeners
      playbackListener = onValue(ref(database, `rooms/${cleanCode}/playback`), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const role = get().role;
        const myUser = get().users.find((u) => u.uid === uid);
        const canControl = myUser?.canControl ?? false;

        // If I am guest and don't have control, stay in sync with host
        if (role === "guest" && !canControl) {
          const manager = QueueManager.getInstance();
          
          // 1. Sync Queue
          if (JSON.stringify(manager.queue) !== JSON.stringify(data.queue)) {
            manager.queue = data.queue || [];
          }

          // 2. Sync Index/Track
          if (manager.index !== data.index) {
            manager.index = data.index;
            // Load track locally
            if (data.index >= 0 && data.index < manager.queue.length) {
              const song = manager.queue[data.index];
              const player = tryGetPlayer();
              if (player) {
                // If it's a new track, load and play it
                const currentLocal = manager.index >= 0 ? manager.queue[manager.index] : null;
                if (!currentLocal || currentLocal.id !== song.id) {
                  manager.playSong(song, manager.queue);
                }
              }
            }
          }

          // 3. Sync Play/Pause
          const player = tryGetPlayer();
          if (player) {
            if (data.isPlaying && !player.playing) {
              player.play();
              manager.isPlaying = true;
            } else if (!data.isPlaying && player.playing) {
              player.pause();
              manager.isPlaying = false;
            }
          }

          // 4. Sync Position (with latency offset)
          if (player && data.position !== undefined) {
            const latency = (Date.now() - data.timestamp) / 1000;
            const targetPos = data.position + latency;
            const diff = Math.abs(player.currentTime - targetPos);
            if (diff > 3) {
              player.seekTo(targetPos);
            }
          }
          
          // Trigger Zustand update
          usePlayerStore.setState({
            queue: manager.queue,
            index: manager.index,
            current: manager.index >= 0 ? manager.queue[manager.index] : null,
            isPlaying: manager.isPlaying,
          });
        }
      });

      usersListener = onValue(ref(database, `rooms/${cleanCode}/users`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          set({ users: Object.values(data) });
        }
      });

      chatListener = onValue(ref(database, `rooms/${cleanCode}/chat`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list: ChatMessage[] = Object.entries(data).map(([id, item]: [string, any]) => ({
            id,
            sender: item.name,
            text: item.text,
            timestamp: item.timestamp,
          })).sort((a, b) => a.timestamp - b.timestamp);
          set({ messages: list });
        }
      });

      reactionListener = onValue(ref(database, `rooms/${cleanCode}/reactions`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          set({ reactions: Object.values(data) });
        }
      });
    } else {
      // Mock Simulation Mode fallback
      const mockUsers: UserProfile[] = [
        { uid: "mock-host", name: "Host DJ", role: "host", canControl: true },
        { uid, name, role: "guest", canControl: false },
      ];
      set({
        users: mockUsers,
        messages: [
          { id: "1", sender: "System", text: "Connected in simulation mode.", timestamp: Date.now() },
        ],
      });
    }

    set({
      roomCode: cleanCode,
      role: get().role || "guest",
      userId: uid,
      userName: name,
      isConnected: true,
      isConnecting: false,
    });

    useToastStore.getState().show(`Joined Room: ${cleanCode}`);
    return true;
  },

  leaveRoom: () => {
    const { roomCode, userId } = get();
    if (!useMock && database && roomCode && userId) {
      // Unsubscribe
      if (playbackListener) off(ref(database, `rooms/${roomCode}/playback`));
      if (usersListener) off(ref(database, `rooms/${roomCode}/users`));
      if (chatListener) off(ref(database, `rooms/${roomCode}/chat`));
      if (reactionListener) off(ref(database, `rooms/${roomCode}/reactions`));
      
      playbackListener = null;
      usersListener = null;
      chatListener = null;
      reactionListener = null;

      // Remove self from room
      firebaseRemove(ref(database, `rooms/${roomCode}/users/${userId}`));
    }

    set({
      roomCode: null,
      role: null,
      users: [],
      messages: [],
      reactions: [],
      isConnected: false,
    });
    
    useToastStore.getState().show("Left room");
  },

  sendMessage: (text) => {
    const { roomCode, userName } = get();
    if (!roomCode || !text.trim()) return;

    if (!useMock && database) {
      firebasePush(ref(database, `rooms/${roomCode}/chat`), {
        name: userName,
        text,
        timestamp: Date.now(),
      });
    } else {
      const msg: ChatMessage = {
        id: Math.random().toString(),
        sender: userName,
        text,
        timestamp: Date.now(),
      };
      set((state) => ({ messages: [...state.messages, msg] }));
    }
  },

  sendReaction: (emoji) => {
    const { roomCode } = get();
    if (!roomCode) return;

    if (!useMock && database) {
      firebasePush(ref(database, `rooms/${roomCode}/reactions`), emoji);
    } else {
      set((state) => ({ reactions: [...state.reactions.slice(-10), emoji] }));
    }
  },

  grantControl: (uid, granted) => {
    const { roomCode, role } = get();
    if (role !== "host" || !roomCode) return;

    if (!useMock && database) {
      firebaseUpdate(ref(database, `rooms/${roomCode}/users/${uid}`), {
        canControl: granted,
      });
    } else {
      set((state) => ({
        users: state.users.map((u) => (u.uid === uid ? { ...u, canControl: granted } : u)),
      }));
    }
  },
}));

// Sync playback helper, called by QueueManager.syncWithZustand()
export function syncPlaybackWithRoom() {
  const { roomCode, role, users, userId } = useRoomStore.getState();
  if (!roomCode) return;

  const myUser = users.find((u) => u.uid === userId);
  const canControl = myUser?.canControl ?? false;

  // Only the host or guests with control permissions sync their playback to the room
  if (role === "host" || canControl) {
    const now = Date.now();
    if (now - lastSyncWrite < 1200) return; // Rate limit writes to every 1.2s
    lastSyncWrite = now;

    const manager = QueueManager.getInstance();
    const player = tryGetPlayer();
    
    const playbackState = {
      currentSong: manager.index >= 0 ? manager.queue[manager.index] : null,
      queue: manager.queue,
      index: manager.index,
      isPlaying: manager.isPlaying,
      position: player ? player.currentTime : 0,
      timestamp: now,
    };

    if (!useMock && database) {
      firebaseSet(ref(database, `rooms/${roomCode}/playback`), playbackState);
    }
  }
}
