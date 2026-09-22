import React from "react";
import { Settings, Volume2, Database, Info } from "lucide-react";
import { useToastStore } from "../store/toastStore";
import { useSettingsStore } from "../store/settingsStore";

export const SettingsView: React.FC = () => {
  const { preferredLanguage, setPreferredLanguage, audioQuality, setAudioQuality } = useSettingsStore();
  const { show: showToast } = useToastStore();

  const handleClearCache = () => {
    localStorage.removeItem("aruvi_recent_searches");
    showToast("Search cache cleared successfully!", "success");
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto pb-44 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#38bdf8]" /> Settings & Preferences
        </h1>
        <p className="text-xs text-slate-400">Configure playback quality, cache, and app settings</p>
      </div>

      {/* Audio Quality */}
      <div className="p-6 bg-slate-900/75 border border-slate-800/80 rounded-3xl space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-[#38bdf8]" />
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
                setAudioQuality(item.id as any);
                showToast(`Audio quality set to ${item.label}`, "success");
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                audioQuality === item.id
                  ? "bg-gradient-to-r from-[#38bdf8]/20 to-[#2563eb]/20 border-[#38bdf8]/50 text-white shadow-lg shadow-[#38bdf8]/10 backdrop-blur-md"
                  : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
            >
              <div className="font-bold text-xs text-white mb-1">{item.label}</div>
              <div className="text-[11px] text-slate-400">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cache & Data */}
      <div className="p-6 bg-slate-900/75 border border-slate-800/80 rounded-3xl space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-[#38bdf8]" />
          <h3 className="text-base font-bold text-white">Cache & Local Storage</h3>
        </div>
        <p className="text-xs text-slate-400">Clear cached search history and temporary audio assets.</p>
        <button
          onClick={handleClearCache}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
        >
          Clear Cache Data
        </button>
      </div>

      {/* About Aruvi Play Web */}
      <div className="p-6 bg-slate-900/75 border border-slate-800/80 rounded-3xl space-y-3 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-[#38bdf8]" />
          <h3 className="text-base font-bold text-white">About Aruvi Play Web Edition</h3>
        </div>
        <div className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
          <p><strong className="text-white">Version:</strong> 1.4.3 Web Edition</p>
          <p><strong className="text-white">Architecture:</strong> Monorepo React + Vite + Tailwind CSS + Supabase Realtime</p>
          <p><strong className="text-white">API Stream:</strong> Official JioSaavn 320kbps DES Decryption engine</p>
        </div>
      </div>
    </div>
  );
};
