import React from "react";
import { useAuthStore } from "../store/authStore";
import {
  Home,
  Search,
  Library,
  Radio,
  Heart,
  ListMusic,
  History,
  User,
  Settings,
  Sparkles,
  Lock,
  Download,
} from "lucide-react";

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const { authMode, openAuthModal } = useAuthStore();
  const isGuest = authMode === "guest";

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "library", label: "Library", icon: Library },
    { id: "rooms", label: "Music Rooms", icon: Radio, badge: "Live" },
  ];

  const libraryItems = [
    { id: "liked", label: "Liked Songs", icon: Heart, authOnly: true },
    { id: "playlists", label: "Playlists", icon: ListMusic, authOnly: true },
    { id: "history", label: "Recently Played", icon: History, authOnly: true },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/60 flex flex-col justify-between shrink-0 select-none hidden md:flex">
      <div>
        {/* Logo Branding */}
        <div
          onClick={() => setActiveView("home")}
          className="flex items-center gap-3 px-6 h-16 cursor-pointer border-b border-zinc-900/80 hover:opacity-90 transition-opacity"
        >
          <img src="/aruvi-play.png" alt="Aruvi Play" className="w-8 h-8 object-contain rounded-xl shadow-lg shadow-emerald-500/10" />
          <div className="flex flex-col">
            <span className="font-extrabold text-white text-base tracking-tight leading-tight">Aruvi Play</span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Web Edition</span>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Menu</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Library Section */}
        <div className="px-3 py-2 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Your Library</div>
          {libraryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const isRestricted = item.authOnly && isGuest;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isRestricted) {
                    openAuthModal("login");
                  } else {
                    setActiveView(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                  <span>{item.label}</span>
                </div>
                {isRestricted && <Lock className="w-3 h-3 text-zinc-600" />}
              </button>
            );
          })}
        </div>

        {/* Guest Upsell Banner */}
        {isGuest && (
          <div className="mx-3 my-3 p-3.5 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 border border-emerald-500/20 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-white">Unlock All Features</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
              Sign in to save playlists, like songs, and join live music rooms.
            </p>
            <button
              onClick={() => openAuthModal("register")}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Create Free Account
            </button>
          </div>
        )}
      </div>

      {/* Bottom Profile & Settings */}
      <div className="p-3 border-t border-zinc-900/80 space-y-1">
        <button
          onClick={() => setActiveView("profile")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
            activeView === "profile" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveView("settings")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
            activeView === "settings" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings & App</span>
        </button>
      </div>
    </aside>
  );
};
