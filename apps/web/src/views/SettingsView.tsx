import React, { useState } from "react";
import { Settings, Volume2, Database, Info, Sliders, Moon, Radio, Zap, ShieldCheck } from "lucide-react";
import { useToastStore } from "../store/toastStore";
import { useSettingsStore } from "../store/settingsStore";
import { usePlayerStore } from "../store/playerStore";
import { EqualizerModal } from "../components/EqualizerModal";
import { SleepTimerModal } from "../components/SleepTimerModal";

export const SettingsView: React.FC = () => {
  const { audioQuality, setAudioQuality } = useSettingsStore();
  const {
    playbackSettings,
    setCrossfadeSeconds,
    toggleAudioNormalization,
    equalizer,
    sleepTimer,
  } = usePlayerStore();
  const { show: showToast } = useToastStore();

  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isSleepOpen, setIsSleepOpen] = useState(false);

  const handleClearCache = () => {
    localStorage.removeItem("aruvi_recent_searches");
    showToast("Search cache cleared successfully!", "success");
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto pb-44 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#38bdf8]" /> Settings & Playback
        </h1>
        <p className="text-xs text-slate-400">Configure audio quality, DSP equalizer, crossfade, and preferences</p>
      </div>

      {/* Audio Playback & Spotify Suite Settings */}
      <div className="p-6 bg-slate-900/75 border border-slate-800/80 rounded-3xl space-y-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
          <Zap className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-base font-bold text-white">Audio & Playback Experience</h3>
            <p className="text-xs text-slate-400">Crossfade, volume leveling, and DSP engine</p>
          </div>
        </div>

        {/* Crossfade Playback */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Crossfade Songs</span>
            <span className="text-xs font-mono font-bold text-sky-400">
              {playbackSettings.crossfadeSeconds > 0 ? `${playbackSettings.crossfadeSeconds}s` : "Off (Gapless)"}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={playbackSettings.crossfadeSeconds}
            onChange={(e) => setCrossfadeSeconds(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 accent-sky-400 rounded-lg cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Allows smooth, seamless transitions between consecutive tracks without silent pauses.
          </p>
        </div>

        {/* Audio Normalization Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div>
            <div className="text-xs font-bold text-white">Audio Normalization</div>
            <div className="text-[11px] text-slate-400">Maintains consistent volume levels across songs</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={playbackSettings.audioNormalization}
              onChange={toggleAudioNormalization}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-sky-400 peer-checked:to-blue-600"></div>
          </label>
        </div>

        {/* Quick Launch Cards for Equalizer & Sleep Timer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Equalizer Launch Card */}
          <div
            onClick={() => setIsEqOpen(true)}
            className="p-4 rounded-2xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-400/50 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">5-Band Equalizer</h4>
                <p className="text-[11px] text-slate-400">
                  {equalizer.enabled ? `Preset: ${equalizer.preset}` : "Disabled"}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-sky-400 group-hover:underline">Open</span>
          </div>

          {/* Sleep Timer Launch Card */}
          <div
            onClick={() => setIsSleepOpen(true)}
            className="p-4 rounded-2xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-400/50 cursor-pointer transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Sleep Timer</h4>
                <p className="text-[11px] text-slate-400">
                  {sleepTimer.active ? "Active countdown" : "Turned off"}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-400 group-hover:underline">Configure</span>
          </div>
        </div>
      </div>

      {/* Audio Quality */}
      <div className="p-6 bg-slate-900/75 border border-slate-800/80 rounded-3xl space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-[#38bdf8]" />
          <h3 className="text-base font-bold text-white">Streaming Audio Quality</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "320kbps", label: "High (320 kbps)", desc: "Lossless clarity, DES decrypted" },
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
          <h3 className="text-base font-bold text-white">Cache & Storage</h3>
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
          <h3 className="text-base font-bold text-white">About Aruvi Play Spotify Suite</h3>
        </div>
        <div className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
          <p><strong className="text-white">Version:</strong> 2.0.0 Pro Edition</p>
          <p><strong className="text-white">DSP Engine:</strong> 5-Band BiquadFilter AudioNode with dynamic preamp</p>
          <p><strong className="text-white">Smart Intelligence:</strong> Similarity clustering with JioSaavn recommendation feeds</p>
        </div>
      </div>

      <EqualizerModal isOpen={isEqOpen} onClose={() => setIsEqOpen(false)} />
      <SleepTimerModal isOpen={isSleepOpen} onClose={() => setIsSleepOpen(false)} />
    </div>
  );
};
