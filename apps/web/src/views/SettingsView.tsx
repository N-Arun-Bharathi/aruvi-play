import React from "react";
import { Settings, Volume2, Database, Info, Globe, Radio, Sparkles, Sliders } from "lucide-react";
import { useToastStore } from "../store/toastStore";
import { useSettingsStore } from "../store/settingsStore";

const AVAILABLE_LANGUAGES = ["Tamil", "Telugu", "Hindi", "Malayalam", "Kannada", "English", "Punjabi"];

export const SettingsView: React.FC = () => {
  const {
    preferredLanguage,
    setPreferredLanguage,
    languages,
    setLanguages,
    audioQuality,
    setAudioQuality,
    autoplay,
    setAutoplay,
  } = useSettingsStore();
  const { show: showToast } = useToastStore();

  const handleToggleLanguage = (lang: string) => {
    let next: string[];
    if (languages.includes(lang)) {
      if (languages.length > 1) {
        next = languages.filter((l) => l !== lang);
      } else {
        return; // Must keep at least one
      }
    } else {
      next = [...languages, lang];
    }
    setLanguages(next);
    setPreferredLanguage(next[0] || "Tamil");
    showToast(`Updated languages: ${next.join(", ")}`, "success");
  };

  const handleClearCache = () => {
    localStorage.removeItem("aruvi_recent_searches");
    showToast("Search cache cleared successfully!", "success");
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto pb-44">
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-cyan-400" /> Settings & Preferences
        </h1>
        <p className="text-xs text-zinc-400">Configure playback quality, preferred languages, and smart recommendations</p>
      </div>

      {/* Preferred Languages */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-base font-bold text-white">Preferred Music Languages</h3>
            <p className="text-xs text-zinc-400">Select the languages you listen to most</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isSelected = languages.includes(lang);
            return (
              <button
                key={lang}
                onClick={() => handleToggleLanguage(lang)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  isSelected
                    ? "bg-cyan-500 text-zinc-950 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                }`}
              >
                {isSelected ? `✓ ${lang}` : `+ ${lang}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Streaming Audio Quality */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Streaming Audio Quality</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "320kbps", label: "High (320 kbps)", desc: "Best audio clarity, DES decrypted" },
            { id: "160kbps", label: "Medium (160 kbps)", desc: "Balanced bandwidth usage" },
            { id: "96kbps", label: "Data Saver (96 kbps)", desc: "Fastest stream, low data" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setAudioQuality(item.id as any);
                showToast(`Audio quality set to ${item.label}`, "success");
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                audioQuality === item.id
                  ? "bg-cyan-500/10 border-cyan-500 text-white shadow-lg"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <div className="font-bold text-xs text-white mb-1">{item.label}</div>
              <div className="text-[11px] text-zinc-500">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Playback Behaviors */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Playback & Auto-Recommendations</h3>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl">
          <div className="space-y-0.5 pr-4">
            <h4 className="text-xs font-bold text-white">Autoplay Related Tracks</h4>
            <p className="text-[11px] text-zinc-400">
              Keep the vibe going by auto-fetching similar tracks in your preferred language when your queue nears completion.
            </p>
          </div>
          <button
            onClick={() => {
              setAutoplay(!autoplay);
              showToast(`Autoplay ${!autoplay ? "Enabled" : "Disabled"}`, "info");
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
              autoplay ? "bg-cyan-500" : "bg-zinc-800"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-zinc-950 shadow-md transform transition-transform ${
                autoplay ? "translate-x-6 bg-zinc-950" : "translate-x-0 bg-zinc-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Cache & Data */}
      <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-cyan-400" />
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
          <Info className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">About Aruvi Play Web Edition</h3>
        </div>
        <div className="text-xs text-zinc-400 space-y-1.5 leading-relaxed">
          <p><strong className="text-white">Version:</strong> 1.5.0 Web Edition (Full Mobile Parity)</p>
          <p><strong className="text-white">Architecture:</strong> Monorepo React + Vite + Tailwind CSS + Supabase Realtime</p>
          <p><strong className="text-white">API Stream:</strong> Official JioSaavn 320kbps DES Decryption engine</p>
        </div>
      </div>
    </div>
  );
};
