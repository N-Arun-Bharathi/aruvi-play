import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { Plus, Key, Radio, Users } from "lucide-react";

interface RoomsViewProps {
  setActiveView?: (view: string) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({ setActiveView }) => {
  const navigate = useNavigate();
  const { activeRooms, fetchActiveRooms, joinRoomByCode, createRoom } = useRoomStore();
  const { openAuthModal, authMode } = useAuthStore();

  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;
    const ok = await joinRoomByCode(code);
    setShowJoinModal(false);
    if (ok) {
      navigate(`/rooms/${code}`);
      if (setActiveView) setActiveView("room-detail");
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const roomCode = await createRoom(newRoomName.trim());
    setShowCreateModal(false);
    if (roomCode) {
      navigate(`/rooms/${roomCode}`);
      if (setActiveView) setActiveView("room-detail");
    }
  };

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto pb-36">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Social Rooms
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Listen together, discover in real-time sync.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
          >
            <Key className="w-4 h-4 text-cyan-400" /> Join with Code
          </button>
          <button
            onClick={() => {
              if (authMode !== "authenticated") {
                openAuthModal("login");
              } else {
                setShowCreateModal(true);
              }
            }}
            className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-400/20"
          >
            <Plus className="w-4 h-4" /> CREATE ROOM
          </button>
        </div>
      </div>

      {/* Real Live Rooms List */}
      {activeRooms.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-zinc-800 rounded-3xl space-y-4 max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Active Rooms Right Now</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Create a new room and share the room code with friends to listen to music together in real-time.
            </p>
          </div>
          <button
            onClick={() => {
              if (authMode !== "authenticated") {
                openAuthModal("login");
              } else {
                setShowCreateModal(true);
              }
            }}
            className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-cyan-400/20"
          >
            Start a Live Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => {
                const code = room.code || room.room_code || "";
                joinRoomByCode(code);
                navigate(`/rooms/${code}`);
                if (setActiveView) setActiveView("room-detail");
              }}
              className="p-5 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 hover:border-cyan-500/40 rounded-3xl cursor-pointer transition-all hover:scale-[1.02] shadow-xl space-y-4 group"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/20">
                  ● LIVE
                </span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  {room.code || room.room_code}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white truncate">{room.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Host: {room.host_name || "Community Host"}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-yellow-400" /> {room.members?.length || 1} listening
                </span>
                <span className="text-cyan-400 font-bold hover:underline">Join & Listen →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Join Room with Code</h3>
            <form onSubmit={handleJoinWithCode} className="space-y-3">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="Enter Code (e.g. AP-4821)"
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm uppercase font-mono tracking-wider focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create Music Room</h3>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room Name (e.g. Tamil Hits)"
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
