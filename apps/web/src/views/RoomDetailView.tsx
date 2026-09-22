import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { usePlayerStore } from "../store/playerStore";
import { Song, searchSongs } from "@aruvi/shared";
import { Radio, Users, Copy, Check, LogOut, Music, Plus, Play, Search, ShieldCheck, Loader2 } from "lucide-react";
import { useToastStore } from "../store/toastStore";

interface RoomDetailViewProps {
  setActiveView?: (view: string) => void;
}

export const RoomDetailView: React.FC<RoomDetailViewProps> = ({ setActiveView }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { currentRoom, activeRooms, joinRoomByCode, leaveRoom, addSongToRoomQueue } = useRoomStore();
  const { currentSong, isPlaying, playSong } = usePlayerStore();
  const toast = useToastStore();

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);

  useEffect(() => {
    if (id && (!currentRoom || (currentRoom.code !== id && currentRoom.id !== id))) {
      setLoadingRoom(true);
      joinRoomByCode(id)
        .catch((e) => console.warn("Failed to join room by route id:", e))
        .finally(() => setLoadingRoom(false));
    }
  }, [id, currentRoom?.id, currentRoom?.code]);

  const handleBack = () => {
    if (setActiveView) {
      setActiveView("rooms");
    } else {
      navigate("/rooms");
    }
  };

  if (loadingRoom) {
    return (
      <div className="p-12 text-center my-16 space-y-4">
        <Loader2 className="w-10 h-10 text-[#38bdf8] mx-auto animate-spin" />
        <h3 className="text-base font-bold text-white">Connecting to Room...</h3>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="p-8 text-center my-16 space-y-4">
        <Radio className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-xl font-bold text-white">No Active Room</h3>
        <button
          onClick={handleBack}
          className="px-5 py-2.5 bg-gradient-to-r from-[#38bdf8] to-[#2563eb] hover:from-[#0ea5e9] hover:to-[#1d4ed8] text-slate-950 font-black text-xs rounded-full shadow-lg shadow-[#38bdf8]/25 transition-all"
        >
          Back to Rooms
        </button>
      </div>
    );
  }

  const copyCode = () => {
    navigator.clipboard.writeText(currentRoom.code);
    setCopied(true);
    toast.show(`Room Code ${currentRoom.code} copied!`, "success");

    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchSongs(searchQuery);
      setSearchResults(res.slice(0, 5));
    } catch (e) {
    } finally {
      setSearching(false);
    }
  };

  const roomQueue = currentRoom.queue || [];
  const members = currentRoom.members || [];

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/85 to-[#0b1329]/85 border border-slate-700/60 p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#38bdf8]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#38bdf8]/15 border border-[#38bdf8]/35 rounded-full text-xs font-bold text-[#38bdf8]">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Room Session
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{currentRoom.name}</h1>
          <p className="text-xs text-slate-400">Host: {currentRoom.host_name}</p>
        </div>

        {/* Room Code Box & Copy */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/60 px-4 py-2.5 rounded-2xl backdrop-blur-md">
            <div className="text-left">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Room Code</span>
              <span className="text-sm font-mono font-black text-[#38bdf8] tracking-wider">{currentRoom.code}</span>
            </div>
            <button
              onClick={copyCode}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Copy Code"
            >
              {copied ? <Check className="w-4 h-4 text-[#38bdf8]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => {
              leaveRoom();
              handleBack();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-2xl transition-all"
          >
            <LogOut className="w-4 h-4" /> Leave Room
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Shared Queue & Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Song to Room Queue */}
          <div className="bg-slate-900/75 border border-slate-800/80 p-6 rounded-3xl space-y-4 shadow-xl backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#38bdf8]" /> Add Songs to Shared Room Queue
            </h3>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search song to add to room..."
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 bg-gradient-to-r from-[#38bdf8] to-[#2563eb] hover:from-[#0ea5e9] hover:to-[#1d4ed8] text-slate-950 text-xs font-black rounded-xl shadow-md shadow-[#38bdf8]/25 transition-all"
              >
                Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2">
                {searchResults.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={song.artwork || "/aruvi-play.png"} alt={song.title} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">{song.title}</h5>
                        <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addSongToRoomQueue(song);
                        setSearchResults([]);
                        setSearchQuery("");
                      }}
                      className="px-3 py-1 bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 text-[#38bdf8] border border-[#38bdf8]/35 text-xs font-bold rounded-lg transition-all"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared Room Queue */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-[#38bdf8]" /> Shared Room Queue ({roomQueue.length})
            </h3>
            {roomQueue.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-700/60 rounded-3xl text-slate-400 text-xs bg-slate-900/40 backdrop-blur-md">
                No songs added to the room queue yet. Use the search box above to add songs!
              </div>
            ) : (
              <div className="space-y-2">
                {roomQueue.map((song, idx) => (
                  <div
                    key={`${song.id}_${idx}`}
                    className="flex items-center justify-between p-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl hover:border-[#38bdf8]/40 transition-all backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-500 w-5 text-center">{idx + 1}</span>
                      <img src={song.artwork || "/aruvi-play.png"} alt={song.title} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{song.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {(song as any).addedBy && (
                        <span className="text-[10px] font-bold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/35 px-2 py-0.5 rounded-full">
                          Added by {(song as any).addedBy}
                        </span>
                      )}
                      <button
                        onClick={() => playSong(song, roomQueue)}
                        className="p-2 bg-gradient-to-r from-[#38bdf8] to-[#2563eb] text-slate-950 hover:from-[#0ea5e9] hover:to-[#1d4ed8] rounded-full transition-transform hover:scale-105 shadow-md shadow-[#38bdf8]/30"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Room Members */}
        <div className="space-y-4">
          <div className="bg-slate-900/75 border border-slate-800/80 p-6 rounded-3xl space-y-4 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#38bdf8]" /> Connected Members ({members.length})
              </h3>
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse shadow-sm shadow-[#38bdf8]" />
            </div>

            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#2563eb] text-slate-950 font-black text-xs flex items-center justify-center shadow-md shadow-[#38bdf8]/20">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">{m.name}</h5>
                    <span className="text-[10px] text-slate-400">Connected in room</span>
                  </div>
                  {m.user_id === currentRoom.host_id && (
                    <span title="Host">
                      <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
