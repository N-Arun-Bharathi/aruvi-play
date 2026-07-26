import { create } from "zustand";
import { generateRoomCode } from "../utils/random";
import { supabase } from "../services/supabase";
import { useToastStore } from "./toastStore";
import { Song } from "../types/song";

export interface MusicRoom {
  id: string;
  code: string;
  name: string;
  host_id: string;
  host_name: string;
  is_active: boolean;
  current_song?: Song | null;
  created_at: string;
}

interface RoomState {
  currentRoom: MusicRoom | null;
  activeRooms: MusicRoom[];
  loading: boolean;

  createRoom: (name: string) => Promise<string | null>;
  joinRoomByCode: (code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  fetchActiveRooms: () => Promise<void>;
  syncPlaybackWithRoom: () => void;
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

      if (data) {
        set({ activeRooms: data as MusicRoom[] });
      }
    } catch (e) {
      console.warn("fetchActiveRooms error:", e);
    } finally {
      set({ loading: false });
    }
  },

  createRoom: async (name: string) => {
    const toast = useToastStore.getState();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.show("Please enter a room name.");
      return null;
    }

    set({ loading: true });
    try {
      const { useAuthStore } = require("./authStore");
      const user = useAuthStore.getState().userProfile;
      const userId = user?.id || "guest-" + Math.floor(Math.random() * 10000);
      const userName = user?.name || "Guest Host";

      const roomCode = generateRoomCode();

      const newRoom: Partial<MusicRoom> = {
        code: roomCode,
        name: cleanName,
        host_id: userId,
        host_name: userName,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("rooms").insert(newRoom).select().single();

      if (error) {
        toast.show(`Failed to create room: ${error.message}`);
        set({ loading: false });
        return null;
      }

      const room = data as MusicRoom;
      set({ currentRoom: room, loading: false });
      toast.show(`Room "${room.name}" created! Code: ${room.code}`);
      return room.id;
    } catch (err: any) {
      toast.show(err.message || "Failed to create room.");
      set({ loading: false });
      return null;
    }
  },

  joinRoomByCode: async (code: string) => {
    const toast = useToastStore.getState();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.show("Please enter a room code.");
      return false;
    }

    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", cleanCode)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.show("Room not found or inactive.");
        set({ loading: false });
        return false;
      }

      const room = data as MusicRoom;
      set({ currentRoom: room, loading: false });
      toast.show(`Joined room "${room.name}"!`);
      return true;
    } catch (err: any) {
      toast.show("Failed to join room.");
      set({ loading: false });
      return false;
    }
  },

  leaveRoom: async () => {
    const toast = useToastStore.getState();
    set({ currentRoom: null });
    toast.show("Left Music Room.");
  },

  syncPlaybackWithRoom: () => {
    // Room sync hook
  },
}));
