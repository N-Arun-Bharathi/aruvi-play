import React, { useState, useEffect } from "react";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { Radio, Plus, LogIn, Users, Sparkles, Copy, Check, ArrowRight } from "lucide-react";

interface RoomsViewProps {
  setActiveView: (view: string) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({ setActiveView }) => {
  const { activeRooms, fetchActiveRooms, createRoom, joinRoomByCode, currentRoom } = useRoomStore();
  const { authMode, openAuthModal } = useAuthStore();

  const [roomNameInput, setRoomNameInput] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  // If user is already inside a room, automatically navigate to room detail
  useEffect(() => {
    if (currentRoom) {
      setActiveView("room-detail");
    }
  }, [currentRoom]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameInput.trim()) return;
    const roomId = await createRoom(roomNameInput);
    if (roomId) {
      setShowCreateModal(false);
      setRoomNameInput("");
      setActiveView("room-detail");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    const success = await joinRoomByCode(roomCodeInput);
    if (success) {
      setShowJoinModal(false);
      setRoomCodeInput("");
      setActiveView("room-detail");
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border border-emerald-500/20 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400 uppercase tracking-widest">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Listen Together
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Collaborative Music Rooms</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Create a live music room, invite friends with a code (e.g. AP-4821), and synchronize song playback in real-time.
          </p>

          <div className="pt-3 flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (authMode === "guest") openAuthModal("login");
                else setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-full shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Create Room
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-full border border-zinc-700 transition-colors"
            >
              <LogIn className="w-4 h-4" /> Join Room Code
            </button>
          </div>
        </div>
      </div>

      {/* Active Music Lounges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" /> Active Public Rooms
          </h2>
          <button onClick={fetchActiveRooms} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {activeRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => joinRoomByCode(room.code)}
              className="group p-5 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 hover:border-emerald-500/30 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    CODE: {room.code}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Users className="w-3.5 h-3.5" /> {(room.members || []).length}
                  </div>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  {room.name}
                </h3>
                <p className="text-xs text-zinc-400">Host: {room.host_name}</p>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-zinc-800/60 mt-4">
                <span className="text-xs text-emerald-400 font-semibold group-hover:underline flex items-center gap-1">
                  Join Session <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white">Create Music Room</h3>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Room Name</label>
                <input
                  type="text"
                  required
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  placeholder="e.g. Arun & Nivi's Chill Beats"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                A unique room code (e.g. AP-4821) will be generated automatically for your friends to join!
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN ROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white">Join Music Room</h3>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Enter Room Code</label>
                <input
                  type="text"
                  required
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="AP-4821"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center uppercase"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
