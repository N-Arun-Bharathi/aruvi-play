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
    <header className="h-16 bg-[#0b1329]/80 border-b border-white/[0.08] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-2xl">
      {/* Header Search Box / Quick Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search songs, artists, rooms..."
            className="w-full bg-slate-800/80 border border-white/10 text-white text-xs rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-all placeholder:text-slate-400 shadow-inner"
          />
        </div>
      </div>

      {/* Top Right Action Icons */}
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 border border-white/10 px-3 py-1.5 rounded-full text-xs text-slate-200 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="bg-transparent text-white focus:outline-none cursor-pointer text-xs font-semibold"
          >
            <option value="Tamil" className="bg-slate-900">Tamil</option>
            <option value="Telugu" className="bg-slate-900">Telugu</option>
            <option value="Hindi" className="bg-slate-900">Hindi</option>
            <option value="Malayalam" className="bg-slate-900">Malayalam</option>
            <option value="Kannada" className="bg-slate-900">Kannada</option>
            <option value="English" className="bg-slate-900">English</option>
          </select>
        </div>

        {/* Settings Icon */}
        <button
          onClick={() => setActiveView("settings")}
          className="w-9 h-9 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:border-sky-400/50 transition-colors shadow-sm"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Avatar */}
        {authMode === "authenticated" && userProfile ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 rounded-full bg-slate-800 border border-sky-500/40 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-sky-400/60 transition-all shadow-md"
            >
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-sky-400 to-blue-600 text-white font-black text-xs flex items-center justify-center">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-slide-in backdrop-blur-2xl">
                <button
                  onClick={() => {
                    setActiveView("profile");
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 text-sky-400" /> My Profile
                </button>
                <button
                  onClick={() => {
                    setActiveView("settings");
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-sky-400" /> Settings
                </button>
                <div className="my-1 border-t border-white/10" />
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
            className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs px-4 py-2 rounded-full transition-all shadow-md shadow-sky-500/25 hover:shadow-sky-500/40"
          >
            <LogIn className="w-3.5 h-3.5 stroke-[2.5]" /> Log In
          </button>
        )}
      </div>
    </header>
  );
};
