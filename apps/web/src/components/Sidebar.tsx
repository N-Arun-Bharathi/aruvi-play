import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Library, Users, Settings } from "lucide-react";

interface SidebarProps {
  activeView?: string;
  setActiveView?: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  const handleNav = (path: string, viewId: string) => {
    navigate(path);
    if (setActiveView) setActiveView(viewId);
  };

  const mainNav = [
    { id: "home", path: "/", label: "Home", icon: Home, match: (p: string) => p === "/" || p === "/home" },
    { id: "search", path: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
    { id: "library", path: "/library", label: "Library", icon: Library, match: (p: string) => p.startsWith("/library") || p.startsWith("/playlist") },
    { id: "rooms", path: "/rooms", label: "Social Rooms", icon: Users, match: (p: string) => p.startsWith("/room") },
  ];

  const secondaryNav = [
    { id: "settings", path: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
  ];

  return (
    <aside className="w-64 bg-[#0F1115] border-r border-zinc-800/60 flex flex-col justify-between p-6 shrink-0 hidden md:flex z-20">
      {/* Top Logo & Main Nav */}
      <div className="space-y-8">
        {/* Brand Logo */}
        <div
          onClick={() => handleNav("/", "home")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center shadow-lg shadow-black/50 group-hover:border-cyan-500/50 transition-all">
            <img src="/aruvi-play.png" alt="Aruvi Play" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight group-hover:text-cyan-400 transition-colors">
              Aruvi Play
            </h1>
            <p className="text-[10px] text-zinc-500 font-medium tracking-wide">WEB PLAYER</p>
          </div>
        </div>

        {/* Main Navigation List */}
        <nav className="space-y-2">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeView ? activeView === item.id : item.match(currentPath);
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.path, item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-zinc-850 text-cyan-400 border border-cyan-500/20 shadow-md shadow-cyan-500/5"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-zinc-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Secondary Nav (Settings) */}
      <div className="space-y-2 border-t border-zinc-850 pt-4">
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeView ? activeView === item.id : item.match(currentPath);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.path, item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-zinc-850 text-cyan-400 border border-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Icon className="w-4 h-4 text-zinc-400" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
