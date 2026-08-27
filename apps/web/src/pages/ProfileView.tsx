import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { User, Mail, Edit3, LogOut, Shield, Download, Smartphone, Check, Sparkles } from "lucide-react";

interface ProfileViewProps {
  setActiveView: (view: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ setActiveView }) => {
  const { authMode, userProfile, updateProfileName, logout, openAuthModal } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile?.name || "");

  const isGuest = authMode === "guest";

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    await updateProfileName(nameInput);
    setIsEditing(false);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto pb-32">
      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border border-emerald-500/20 p-6 sm:p-10 shadow-2xl flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-emerald-500 text-zinc-950 font-black text-3xl flex items-center justify-center shadow-2xl shrink-0">
          {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "A"}
        </div>

        <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" /> {isGuest ? "Guest Listener" : "Authenticated Account"}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2 pt-1 max-w-xs">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button type="submit" className="p-2 bg-emerald-500 text-zinc-950 rounded-xl font-bold text-xs">
                <Check className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">{userProfile?.name}</h1>
              <button
                onClick={() => {
                  setNameInput(userProfile?.name || "");
                  setIsEditing(true);
                }}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                title="Edit Name"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}

          {userProfile?.email && <p className="text-xs text-zinc-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {userProfile.email}</p>}
        </div>
      </div>

      {/* Android Mobile App Promo */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Get Aruvi Play Android App</h3>
              <p className="text-xs text-zinc-400">Download the native mobile app for Android</p>
            </div>
          </div>
          <a
            href="https://github.com/N-Arun-Bharathi/aruvi-play/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Download className="w-4 h-4" /> Download APK
          </a>
        </div>
      </div>

      {/* Account Actions */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white">Account Management</h3>

        {isGuest ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              You are currently listening in Guest Mode. Log in to sync playlists, liked songs, and room sessions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => openAuthModal("login")}
                className="px-5 py-2.5 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl"
              >
                Log In
              </button>
              <button
                onClick={() => openAuthModal("register")}
                className="px-5 py-2.5 bg-zinc-800 text-white font-semibold text-xs rounded-xl border border-zinc-700"
              >
                Register
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={logout}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" /> Log Out of Aruvi Play
          </button>
        )}
      </div>
    </div>
  );
};
