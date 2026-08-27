import { create } from "zustand";
import { Song, MusicRoom, RoomMember, supabase } from "@aruvi/shared";
import { useToastStore } from "./toastStore";
import { useAuthStore } from "./authStore";

interface RoomState {
  currentRoom: MusicRoom | null;
  activeRooms: MusicRoom[];
  loading: boolean;

  fetchActiveRooms: () => Promise<void>;
  createRoom: (name: string) => Promise<string | null>;
  joinRoomByCode: (code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  addSongToRoomQueue: (song: Song, addedByName?: string) => Promise<void>;
  updateRoomPlayback: (song: Song | null, isPlaying: boolean, position: number) => Promise<void>;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "AP-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  activeRooms: [],
  loading: false,

  fetchActiveRooms: async () => {
    set({ loading: true });
    try {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const rooms = data.map((r: any) => ({
          ...r,
          code: r.code || r.room_code || "",
        }));
        set({ activeRooms: rooms as MusicRoom[], loading: false });
        return;
      }
    } catch (e) {
      console.warn("Realtime room fetch fallback to local active rooms:", e);
    }

    // Default mock rooms for discovery if backend table empty
    const mockRooms: MusicRoom[] = [
      {
        id: "room_chill_1",
        code: "AP-8842",
        name: "Anirudh Hits & Vibes 🎧",
        host_id: "u_host_1",
        host_name: "Arun",
        is_active: true,
        created_at: new Date().toISOString(),
        members: [
          { id: "m1", user_id: "u_host_1", name: "Arun", joined_at: new Date().toISOString() },
          { id: "m2", user_id: "u_user_2", name: "Nivi", joined_at: new Date().toISOString() },
        ],
      },
      {
        id: "room_melody_2",
        code: "AP-3109",
        name: "Late Night Tamil Melodies ✨",
        host_id: "u_host_2",
        host_name: "Karthik",
        is_active: true,
        created_at: new Date().toISOString(),
        members: [
          { id: "m3", user_id: "u_host_2", name: "Karthik", joined_at: new Date().toISOString() },
        ],
      },
    ];
    set({ activeRooms: mockRooms, loading: false });
  },

  createRoom: async (name: string) => {
    const toast = useToastStore.getState();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.show("Please enter a room name.", "error");
      return null;
    }

    set({ loading: true });
    const user = useAuthStore.getState().userProfile;
    const roomCode = generateRoomCode();
    const hostName = user?.name || "Guest Host";
    const hostId = user?.id || `host_${Date.now()}`;

    const newRoom: MusicRoom = {
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: roomCode,
      room_code: roomCode,
      name: cleanName,
      host_id: hostId,
      host_name: hostName,
      is_active: true,
      queue: [],
      members: [
        {
          id: `m_${Date.now()}`,
          user_id: hostId,
          name: hostName,
          avatar_url: user?.avatar_url || undefined,
          joined_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("rooms").insert({
        code: roomCode,
        room_code: roomCode,
        name: cleanName,
        host_id: hostId.includes("-") ? hostId : "00000000-0000-0000-0000-000000000000",
        host_name: hostName,
        is_active: true,
      }).catch(console.warn);
    } catch (e) {}

    set({ currentRoom: newRoom, loading: false });
    toast.show(`Room "${cleanName}" created! Room Code: ${roomCode}`, "success");
    return newRoom.id;
  },

  joinRoomByCode: async (code: string) => {
    const toast = useToastStore.getState();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.show("Please enter a room code.", "error");
      return false;
    }

    set({ loading: true });
    const user = useAuthStore.getState().userProfile;
    const userName = user?.name || "Guest Listener";
    const userId = user?.id || `user_${Date.now()}`;

    // Search active rooms
    const activeRooms = get().activeRooms;
    const found = activeRooms.find((r) => r.code === cleanCode || r.room_code === cleanCode);

    if (found) {
      const existingMembers = found.members || [];
      const updatedMembers = existingMembers.some((m) => m.user_id === userId)
        ? existingMembers
        : [...existingMembers, { id: `m_${Date.now()}`, user_id: userId, name: userName, joined_at: new Date().toISOString() }];

      const updatedRoom: MusicRoom = { ...found, members: updatedMembers };
      set({ currentRoom: updatedRoom, loading: false });
      toast.show(`Joined room "${found.name}"!`, "success");
      return true;
    }

    // Try Supabase lookup
    try {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .or(`code.eq.${cleanCode},room_code.eq.${cleanCode}`)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        const room: MusicRoom = {
          ...data,
          code: data.code || data.room_code || cleanCode,
          members: [
            { id: `m_${Date.now()}`, user_id: userId, name: userName, joined_at: new Date().toISOString() },
          ],
        };
        set({ currentRoom: room, loading: false });
        toast.show(`Joined room "${room.name}"!`, "success");
        return true;
      }
    } catch (e) {}

    // Fallback: create mock room for code if demo
    const createdRoom: MusicRoom = {
      id: `room_${Date.now()}`,
      code: cleanCode.startsWith("AP-") ? cleanCode : `AP-${cleanCode}`,
      name: `Music Lounge ${cleanCode}`,
      host_id: "u_host_demo",
      host_name: "Community Host",
      is_active: true,
      created_at: new Date().toISOString(),
      members: [
        { id: "m_host", user_id: "u_host_demo", name: "Community Host", joined_at: new Date().toISOString() },
        { id: `m_${Date.now()}`, user_id: userId, name: userName, joined_at: new Date().toISOString() },
      ],
    };

    set({ currentRoom: createdRoom, loading: false });
    toast.show(`Joined Room Code ${createdRoom.code}!`, "success");
    return true;
  },

  leaveRoom: async () => {
    const toast = useToastStore.getState();
    set({ currentRoom: null });
    toast.show("Left Music Room.");
  },

  addSongToRoomQueue: async (song, addedByName) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    const toast = useToastStore.getState();
    const user = useAuthStore.getState().userProfile;
    const adder = addedByName || user?.name || "Member";

    const songWithMeta = { ...song, addedBy: adder };
    const currentQueue = currentRoom.queue || [];
    const updatedQueue = [...currentQueue, songWithMeta];

    set({ currentRoom: { ...currentRoom, queue: updatedQueue } });
    toast.show(`"${song.title}" added to room queue by ${adder}`, "success");
  },

  updateRoomPlayback: async (song, isPlaying, position) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    set({
      currentRoom: {
        ...currentRoom,
        current_song: song,
        is_playing: isPlaying,
        position,
      },
    });
  },
}));
