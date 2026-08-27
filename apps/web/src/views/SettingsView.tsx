import React, { useState } from "react";
import { Settings, Sliders, Volume2, ShieldCheck, Database, Info, Sparkles } from "lucide-react";
import { useToastStore } from "../store/toastStore";

export const SettingsView: React.FC = () => {
  const [audioQuality, setAudioQuality] = useState("320kbps");
  const [normalizeVolume, setNormalizeVolume] = useState(true);
  const toast = useToastStore();

  const handleClearCache = () => {
    localStorage.removeItem("aruvi_recent_searches");
    toast.show("Search cache cleared successfully!", "success");
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto pb-32">
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-emerald-400" /> Settings & Preferences
        </h1>
        <p className="text-xs text-zinc-400">Configure playback quality, cache, and app settings</p>
      </div>

      {/* Audio Quality */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Streaming Audio Quality</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "320kbps", label: "High (320 kbps)", desc: "Best audio clarity, DES decrypted" },
            { id: "160kbps", label: "Medium (160 kbps)", desc: "Balanced data usage" },
            { id: "96kbps", label: "Data Saver (96 kbps)", desc: "Low data consumption" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setAudioQuality(item.id);
                toast.show(`Audio quality set to ${item.label}`, "success");
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                audioQuality === item.id
                  ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <div className="font-bold text-xs text-white mb-1">{item.label}</div>
              <div className="text-[11px] text-zinc-500">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cache & Data */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Cache & Local Storage</h3>
        </div>
        <p className="text-xs text-zinc-400">Clear cached search history and temporary audio assets.</p>
        <button
          onClick={handleClearCache}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl border border-zinc-700 transition-colors"
        >
          Clear Cache Data
        </button>
      </div>

      {/* About Aruvi Play Web */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-3 shadow-xl">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">About Aruvi Play Web Edition</h3>
        </div>
        <div className="text-xs text-zinc-400 space-y-1.5 leading-relaxed">
          <p><strong className="text-white">Version:</strong> 1.4.3 Web Edition</p>
          <p><strong className="text-white">Architecture:</strong> Monorepo React 19 + Vite + Tailwind CSS + Supabase Realtime</p>
          <p><strong className="text-white">API Stream:</strong> Official JioSaavn 320kbps DES Decryption engine</p>
        </div>
      </div>
    </div>
  );
};
