import React from "react";
import { Home, Search, ListMusic, Library, Users, Settings } from "lucide-react";

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const mainNav = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "library", label: "Library", icon: Library },
    { id: "rooms", label: "Social Rooms", icon: Users },
  ];

  const secondaryNav = [
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0b1329]/80 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col justify-between p-6 shrink-0 hidden md:flex z-20 shadow-2xl">
      {/* Top Logo & Main Nav */}
      <div className="space-y-8">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveView("home")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-sky-500/30 p-1 flex items-center justify-center shadow-lg group-hover:border-sky-400 group-hover:shadow-sky-500/20 transition-all">
            <img src="/aruvi-play.png" alt="Aruvi Play" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight group-hover:text-sky-400 transition-colors">
              Aruvi Play
            </h1>
            <p className="text-[10px] text-sky-400 font-semibold tracking-wide">WEB PLAYER</p>
          </div>
        </div>

        {/* Main Navigation List */}
        <nav className="space-y-1.5">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id || (item.id === "rooms" && activeView === "room-detail");
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-sky-500/20 to-blue-600/10 text-sky-400 border border-sky-500/40 shadow-md shadow-sky-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Secondary Nav (Settings) */}
      <div className="space-y-1.5 border-t border-white/[0.08] pt-4">
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-sky-500/20 to-blue-600/10 text-sky-400 border border-sky-500/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4 text-slate-400" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
