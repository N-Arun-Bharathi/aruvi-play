import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Library, Radio, User } from "lucide-react";

interface MobileBottomNavProps {
  activeView?: string;
  setActiveView?: (view: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeView, setActiveView }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { id: "home", path: "/", label: "Home", icon: Home, match: (p: string) => p === "/" || p === "/home" },
    { id: "search", path: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
    { id: "library", path: "/library", label: "Library", icon: Library, match: (p: string) => p.startsWith("/library") || p.startsWith("/playlist") },
    { id: "rooms", path: "/rooms", label: "Rooms", icon: Radio, match: (p: string) => p.startsWith("/room") },
    { id: "profile", path: "/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/profile") },
  ];

  const handleNav = (path: string, id: string) => {
    navigate(path);
    if (setActiveView) setActiveView(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 flex items-center justify-around z-40 md:hidden select-none px-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView ? activeView === tab.id : tab.match(currentPath);
        return (
          <button
            key={tab.id}
            onClick={() => handleNav(tab.path, tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isActive ? "text-cyan-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "scale-110" : ""}`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
