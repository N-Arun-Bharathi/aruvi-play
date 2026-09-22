import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { X, Mail, Lock, User, LogIn, UserPlus, HelpCircle, UserCheck } from "lucide-react";

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    openAuthModal,
    loginWithEmail,
    signUpWithEmail,
    resetPassword,
    continueAsGuest,
    loading,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authModalTab === "login") {
      await loginWithEmail(email, password);
    } else if (authModalTab === "register") {
      await signUpWithEmail(email, password, displayName);
    } else if (authModalTab === "forgot") {
      await resetPassword(email);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-[#0b1329] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Decorative sky gradient blur */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#38bdf8]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Logo */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/aruvi-play.png" alt="Aruvi Play" className="w-10 h-10 object-contain rounded-xl shadow-md shadow-[#38bdf8]/20" />
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Aruvi Play</h2>
            <p className="text-xs text-slate-400">Your Music, Synchronized Anywhere</p>
          </div>
        </div>

        {/* Auth Tabs */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            onClick={() => openAuthModal("login")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalTab === "login"
                ? "bg-gradient-to-r from-[#38bdf8] to-[#2563eb] text-slate-950 shadow-md shadow-[#38bdf8]/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => openAuthModal("register")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalTab === "register"
                ? "bg-gradient-to-r from-[#38bdf8] to-[#2563eb] text-slate-950 shadow-md shadow-[#38bdf8]/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Register
          </button>
          <button
            onClick={() => openAuthModal("forgot")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalTab === "forgot"
                ? "bg-gradient-to-r from-[#38bdf8] to-[#2563eb] text-slate-950 shadow-md shadow-[#38bdf8]/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Reset
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalTab === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Arun Bharathi"
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/40 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/40 transition-colors"
              />
            </div>
          </div>

          {authModalTab !== "forgot" && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/40 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-[#38bdf8] to-[#2563eb] hover:from-[#0ea5e9] hover:to-[#1d4ed8] text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-[#38bdf8]/30 transition-all flex items-center justify-center gap-2"
          >
            {authModalTab === "login" && (
              <>
                <LogIn className="w-4 h-4 stroke-[2.5]" /> Log In
              </>
            )}
            {authModalTab === "register" && (
              <>
                <UserPlus className="w-4 h-4 stroke-[2.5]" /> Create Account
              </>
            )}
            {authModalTab === "forgot" && (
              <>
                <HelpCircle className="w-4 h-4 stroke-[2.5]" /> Send Reset Link
              </>
            )}
          </button>
        </form>

        {/* Guest Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-3 text-slate-400 font-medium">Or</span>
          </div>
        </div>

        {/* Guest Mode Action */}
        <button
          onClick={continueAsGuest}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
        >
          <UserCheck className="w-4 h-4 text-[#38bdf8]" /> Continue as Guest
        </button>
      </div>
    </div>
  );
};
