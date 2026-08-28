import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useSettingsStore } from "../store/settingsStore";
import { Search, Settings, LogIn, LogOut, Globe, User } from "lucide-react";

interface HeaderProps {
  onSearchChange?: (val: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchChange, activeView, setActiveView }) => {
  const { authMode, userProfile, openAuthModal, logout } = useAuthStore();
  const { preferredLanguage, setPreferredLanguage } = useSettingsStore();
  const [query, setQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (onSearchChange) onSearchChange(val);
    if (activeView !== "search" && val.trim().length > 0) {
      setActiveView("search");
    }
  };

  return (
    <header className="h-16 bg-[#0F1115]/90 border-b border-zinc-850 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Header Search Box / Quick Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search songs, artists, rooms..."
            className="w-full bg-zinc-900/90 border border-zinc-800 text-white text-xs rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Top Right Action Icons */}
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-xs text-zinc-300">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="bg-transparent text-white focus:outline-none cursor-pointer text-xs font-semibold"
          >
            <option value="Tamil" className="bg-zinc-900">Tamil</option>
            <option value="Telugu" className="bg-zinc-900">Telugu</option>
            <option value="Hindi" className="bg-zinc-900">Hindi</option>
            <option value="Malayalam" className="bg-zinc-900">Malayalam</option>
            <option value="Kannada" className="bg-zinc-900">Kannada</option>
            <option value="English" className="bg-zinc-900">English</option>
          </select>
        </div>

        {/* Settings Icon */}
        <button
          onClick={() => setActiveView("settings")}
          className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Avatar */}
        {authMode === "authenticated" && userProfile ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 rounded-full bg-zinc-850 border border-zinc-700 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-cyan-400/50 transition-all"
            >
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-cyan-500 to-emerald-400 text-zinc-950 font-black text-xs flex items-center justify-center">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-slide-in">
                <button
                  onClick={() => {
                    setActiveView("profile");
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 text-cyan-400" /> My Profile
                </button>
                <button
                  onClick={() => {
                    setActiveView("settings");
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-cyan-400" /> Settings
                </button>
                <div className="my-1 border-t border-zinc-800" />
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => openAuthModal("login")}
            className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold px-4 py-2 rounded-full transition-all shadow-md hover:shadow-cyan-500/20"
          >
            <LogIn className="w-3.5 h-3.5" /> Log In
          </button>
        )}
      </div>
    </header>
  );
};
