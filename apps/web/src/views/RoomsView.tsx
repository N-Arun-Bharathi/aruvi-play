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
    <div className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto pb-36 animate-fade-in">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Social Rooms
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Listen together, discover in sync.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            <Key className="w-4 h-4 text-sky-400" /> Join with Code
          </button>
          <button
            onClick={() => {
              if (authMode !== "authenticated") {
                openAuthModal("login");
              } else {
                setShowCreateModal(true);
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/30"
          >
            <Plus className="w-4 h-4" /> CREATE ROOM
          </button>
        </div>
      </div>

      {/* Featured Live Rooms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Live Now Featured Card (2 Columns) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 via-slate-900 to-[#0b1329] border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between space-y-6 shadow-2xl backdrop-blur-xl">
          {/* Sky blue glow background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-sky-400 bg-sky-500/15 px-3 py-1 rounded-full border border-sky-500/30 shadow-sm">
                ● LIVE NOW
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">Synthwave Sessions 📻</h2>
              <p className="text-xs text-slate-300 font-medium">Host: DJ_Neon</p>
            </div>
          </div>

          {/* Player Banner inside Card */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-4 relative z-10 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">Midnight City Run</h4>
                <p className="text-[11px] text-slate-400 truncate">Kavinsky</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"].map((u, i) => (
                  <img key={i} src={u} alt="user" className="w-6 h-6 rounded-full border border-slate-900 object-cover" />
                ))}
                <span className="w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold text-slate-200 flex items-center justify-center border border-slate-900">
                  +42
                </span>
              </div>
              <button
                onClick={() => {
                  joinRoomByCode("SYNTH-99");
                  setActiveView("room-detail");
                }}
                className="bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-sky-500/25"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>

        {/* Private Room Card */}
        <div className="bg-slate-800/60 hover:bg-slate-800/90 border border-white/[0.08] hover:border-sky-400/40 rounded-3xl p-6 flex flex-col justify-between space-y-6 transition-all backdrop-blur-xl shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-sky-400 bg-sky-500/15 px-2.5 py-1 rounded-full border border-sky-500/30">
                <Lock className="w-3 h-3" /> PRIVATE
              </span>
              <div className="flex -space-x-1.5">
                {["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"].map((u, i) => (
                  <img key={i} src={u} alt="user" className="w-5 h-5 rounded-full border border-slate-900 object-cover" />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Lo-Fi Study Vibes</h3>
              <p className="text-xs text-slate-400">4 members</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="truncate">Coffee Shop Ambience</span>
            <span className="text-[10px] text-slate-500">Various Artists</span>
          </div>
        </div>

        {/* Public Room Card */}
        <div className="bg-slate-800/60 hover:bg-slate-800/90 border border-white/[0.08] hover:border-sky-400/40 rounded-3xl p-6 flex flex-col justify-between space-y-6 transition-all backdrop-blur-xl shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-sky-400 bg-sky-500/15 px-2.5 py-1 rounded-full border border-sky-500/30">
                <Globe className="w-3 h-3" /> PUBLIC
              </span>
              <span className="text-[10px] text-sky-400 font-bold">+12</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Deep Focus Ambient</h3>
              <p className="text-xs text-slate-400">12 members</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="italic">Nothing playing</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Join Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Join Room with Code</h3>
            <form onSubmit={handleJoinWithCode} className="space-y-3">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="Enter Code (e.g. AP-4821)"
                className="w-full bg-slate-800 border border-white/15 text-white rounded-xl px-4 py-2.5 text-sm uppercase font-mono tracking-wider focus:outline-none focus:border-sky-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create Music Room</h3>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room Name (e.g. Anirudh Hits)"
                className="w-full bg-slate-800 border border-white/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/30"
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
