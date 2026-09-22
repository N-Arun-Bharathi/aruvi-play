import React from "react";
import { Home, Search, ListMusic, Library, Radio } from "lucide-react";

interface MobileBottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeView, setActiveView }) => {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "library", label: "Library", icon: Library },
    { id: "rooms", label: "Rooms", icon: Radio },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 flex items-center justify-around z-40 md:hidden select-none px-2 shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isActive ? "text-[#38bdf8] font-bold drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" : "text-slate-400 hover:text-white"
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
