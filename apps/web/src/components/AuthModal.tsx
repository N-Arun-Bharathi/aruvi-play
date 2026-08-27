import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { X, Mail, Lock, User, LogIn, UserPlus, HelpCircle } from "lucide-react";

interface AuthModalProps {
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isMandatory = false }) => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    openAuthModal,
    loginWithEmail,
    signUpWithEmail,
    resetPassword,
    authMode,
    loading,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const forceShow = isMandatory || authMode !== "authenticated";
  if (!isAuthModalOpen && !forceShow) return null;

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
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Decorative emerald gradient blur */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button (only shown if not mandatory) */}
        {!forceShow && (
          <button
            onClick={closeAuthModal}
            className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Logo */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/aruvi-play.png" alt="Aruvi Play" className="w-12 h-12 object-contain rounded-xl shadow-md shadow-emerald-500/20" />
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Aruvi Play</h2>
            <p className="text-xs text-emerald-400 font-medium">Log in to access Web Music Player</p>
          </div>
        </div>

        {/* Auth Tabs */}
        <div className="flex bg-zinc-850 p-1 rounded-xl mb-6 border border-zinc-800/80">
          <button
            onClick={() => openAuthModal("login")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalTab === "login"
                ? "bg-emerald-500 text-zinc-950 shadow-md font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => openAuthModal("register")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalTab === "register"
                ? "bg-emerald-500 text-zinc-950 shadow-md font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Register
          </button>
          <button
            onClick={() => openAuthModal("forgot")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalTab === "forgot"
                ? "bg-emerald-500 text-zinc-950 shadow-md font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Reset
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalTab === "register" && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Arun Bharathi"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {authModalTab !== "forgot" && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            {authModalTab === "login" && (
              <>
                <LogIn className="w-4 h-4" /> Log In to Web Player
              </>
            )}
            {authModalTab === "register" && (
              <>
                <UserPlus className="w-4 h-4" /> Create Account
              </>
            )}
            {authModalTab === "forgot" && (
              <>
                <HelpCircle className="w-4 h-4" /> Send Reset Link
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Only authenticated accounts can access Aruvi Play Web.
        </p>
      </div>
    </div>
  );
};
