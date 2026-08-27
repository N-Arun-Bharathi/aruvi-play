import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { Search, ChevronLeft, ChevronRight, User, LogIn, LogOut, Settings, Globe, Shield } from "lucide-react";

interface HeaderProps {
  onSearchChange?: (val: string) => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchChange, activeView, setActiveView }) => {
  const { authMode, userProfile, openAuthModal, logout } = useAuthStore();
  const [query, setQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState("Tamil");
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
    <header className="h-16 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Navigation & Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {/* Back / Forward */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Global Search Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search songs, artists, albums..."
            className="w-full bg-zinc-900/90 border border-zinc-800 text-white text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-3">
        {/* Language Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-full text-xs text-zinc-300">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="bg-transparent text-white focus:outline-none cursor-pointer"
          >
            <option value="Tamil" className="bg-zinc-900">Tamil</option>
            <option value="Telugu" className="bg-zinc-900">Telugu</option>
            <option value="Hindi" className="bg-zinc-900">Hindi</option>
            <option value="Malayalam" className="bg-zinc-900">Malayalam</option>
            <option value="Kannada" className="bg-zinc-900">Kannada</option>
            <option value="English" className="bg-zinc-900">English</option>
          </select>
        </div>

        {/* User Auth Profile */}
        {authMode === "authenticated" && userProfile ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1.5 pr-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-full transition-all"
            >
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.name} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center justify-center">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-200 max-w-[100px] truncate">{userProfile.name}</span>
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
                  <User className="w-4 h-4 text-emerald-400" /> My Profile
                </button>
                <button
                  onClick={() => {
                    setActiveView("settings");
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-emerald-400" /> Settings
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
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/60 px-2.5 py-1 rounded-full border border-zinc-800">
              <Shield className="w-3 h-3 text-emerald-400" /> Guest Mode
            </span>
            <button
              onClick={() => openAuthModal("login")}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold px-4 py-2 rounded-full transition-all shadow-md hover:shadow-emerald-500/20"
            >
              <LogIn className="w-3.5 h-3.5" /> Log In
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
