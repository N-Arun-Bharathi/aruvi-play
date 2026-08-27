import React from "react";
import { Home, Search, Library, Radio, User } from "lucide-react";

interface MobileBottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeView, setActiveView }) => {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "library", label: "Library", icon: Library },
    { id: "rooms", label: "Rooms", icon: Radio },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 flex items-center justify-around z-40 md:hidden select-none px-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isActive ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
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
