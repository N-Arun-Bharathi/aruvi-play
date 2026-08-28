import React, { useState, useEffect } from "react";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { Plus, Key, Lock, Globe, Radio, ArrowRight } from "lucide-react";

interface RoomsViewProps {
  setActiveView: (view: string) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({ setActiveView }) => {
  const { fetchActiveRooms, joinRoomByCode, createRoom } = useRoomStore();
  const { openAuthModal, authMode } = useAuthStore();

  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    joinRoomByCode(joinCodeInput.trim().toUpperCase());
    setShowJoinModal(false);
    setActiveView("room-detail");
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const room = await createRoom(newRoomName.trim());
    setShowCreateModal(false);
    if (room) setActiveView("room-detail");
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
            Listen together, discover in sync.
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

      {/* Featured Live Rooms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Live Now Featured Card (2 Columns) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between space-y-6">
          {/* Subtle cyan glow background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/20">
                ● LIVE NOW
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">Synthwave Sessions 📻</h2>
              <p className="text-xs text-zinc-400 font-medium">Host: DJ_Neon</p>
            </div>
          </div>

          {/* Player Banner inside Card */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">Midnight City Run</h4>
                <p className="text-[11px] text-zinc-400 truncate">Kavinsky</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"].map((u, i) => (
                  <img key={i} src={u} alt="user" className="w-6 h-6 rounded-full border border-zinc-900 object-cover" />
                ))}
                <span className="w-6 h-6 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center justify-center border border-zinc-900">
                  +42
                </span>
              </div>
              <button
                onClick={() => {
                  joinRoomByCode("SYNTH-99");
                  setActiveView("room-detail");
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>

        {/* Private Room Card */}
        <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-yellow-400 bg-yellow-950/40 px-2.5 py-1 rounded-full border border-yellow-500/20">
                <Lock className="w-3 h-3" /> PRIVATE
              </span>
              <div className="flex -space-x-1.5">
                {["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"].map((u, i) => (
                  <img key={i} src={u} alt="user" className="w-5 h-5 rounded-full border border-zinc-900 object-cover" />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Lo-Fi Study Vibes</h3>
              <p className="text-xs text-zinc-400">4 members</p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-400">
            <span className="truncate">Coffee Shop Ambience</span>
            <span className="text-[10px] text-zinc-500">Various Artists</span>
          </div>
        </div>

        {/* Public Room Card */}
        <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-500/20">
                <Globe className="w-3 h-3" /> PUBLIC
              </span>
              <span className="text-[10px] text-zinc-500 font-bold">+12</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Deep Focus Ambient</h3>
              <p className="text-xs text-zinc-400">12 members</p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-400">
            <span className="italic">Nothing playing</span>
            <ArrowRight className="w-4 h-4 text-zinc-500" />
          </div>
        </div>
      </div>

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
                placeholder="Room Name (e.g. Anirudh Hits)"
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
