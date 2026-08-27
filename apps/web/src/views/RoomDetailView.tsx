import React, { useState } from "react";
import { useRoomStore } from "../store/roomStore";
import { usePlayerStore } from "../store/playerStore";
import { Song, searchSongs } from "@aruvi/shared";
import { Radio, Users, Copy, Check, LogOut, Music, Plus, Play, Search, ShieldCheck } from "lucide-react";
import { useToastStore } from "../store/toastStore";

interface RoomDetailViewProps {
  setActiveView: (view: string) => void;
}

export const RoomDetailView: React.FC<RoomDetailViewProps> = ({ setActiveView }) => {
  const { currentRoom, leaveRoom, addSongToRoomQueue } = useRoomStore();
  const { currentSong, isPlaying, playSong } = usePlayerStore();
  const toast = useToastStore();

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);

  if (!currentRoom) {
    return (
      <div className="p-8 text-center my-16 space-y-4">
        <Radio className="w-12 h-12 text-zinc-600 mx-auto" />
        <h3 className="text-xl font-bold text-white">No Active Room</h3>
        <button
          onClick={() => setActiveView("rooms")}
          className="px-5 py-2.5 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-full"
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
      <div className="bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border border-emerald-500/20 p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Room Session
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{currentRoom.name}</h1>
          <p className="text-xs text-zinc-400">Host: {currentRoom.host_name}</p>
        </div>

        {/* Room Code Box & Copy */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-2xl">
            <div className="text-left">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Room Code</span>
              <span className="text-sm font-mono font-black text-emerald-400 tracking-wider">{currentRoom.code}</span>
            </div>
            <button
              onClick={copyCode}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
              title="Copy Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => {
              leaveRoom();
              setActiveView("rooms");
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
          <div className="bg-zinc-900/60 border border-zinc-850 p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Add Songs to Shared Room Queue
            </h3>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search song to add to room..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition-all"
              >
                Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2">
                {searchResults.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={song.artwork || "/aruvi-play.png"} alt={song.title} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">{song.title}</h5>
                        <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addSongToRoomQueue(song);
                        setSearchResults([]);
                        setSearchQuery("");
                      }}
                      className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg transition-all"
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
              <Music className="w-4 h-4 text-emerald-400" /> Shared Room Queue ({roomQueue.length})
            </h3>
            {roomQueue.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-3xl text-zinc-500 text-xs">
                No songs added to the room queue yet. Use the search box above to add songs!
              </div>
            ) : (
              <div className="space-y-2">
                {roomQueue.map((song, idx) => (
                  <div
                    key={`${song.id}_${idx}`}
                    className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-850 rounded-2xl hover:border-zinc-750 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className="text-xs font-bold text-zinc-500 w-5 text-center">{idx + 1}</span>
                      <img src={song.artwork || "/aruvi-play.png"} alt={song.title} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{song.title}</h4>
                        <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {(song as any).addedBy && (
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Added by {(song as any).addedBy}
                        </span>
                      )}
                      <button
                        onClick={() => playSong(song, roomQueue)}
                        className="p-2 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 rounded-full transition-transform hover:scale-105"
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
          <div className="bg-zinc-900/60 border border-zinc-850 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Connected Members ({members.length})
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center justify-center">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">{m.name}</h5>
                    <span className="text-[10px] text-zinc-500">Connected in room</span>
                  </div>
                  {m.user_id === currentRoom.host_id && (
                    <span title="Host">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
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
