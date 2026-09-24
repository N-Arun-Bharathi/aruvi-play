import React from "react";
import { usePlayerStore } from "../store/playerStore";
import { EqualizerPresetName, EQUALIZER_PRESETS, EqualizerBands } from "@aruvi/shared";
import { Sliders, X, Sparkles, Volume2, RotateCcw } from "lucide-react";

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BAND_LABELS: Array<{ key: keyof EqualizerBands; label: string; desc: string }> = [
  { key: "band60", label: "60 Hz", desc: "Sub Bass" },
  { key: "band230", label: "230 Hz", desc: "Bass" },
  { key: "band910", label: "910 Hz", desc: "Midrange" },
  { key: "band3600", label: "3.6 kHz", desc: "Presence" },
  { key: "band14000", label: "14 kHz", desc: "Air / Treble" },
];

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const {
    equalizer,
    setEqualizerEnabled,
    setEqualizerPreset,
    setEqualizerBand,
    setEqualizerPreamp,
  } = usePlayerStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-500/15 backdrop-blur-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#38bdf8] to-[#2563eb] flex items-center justify-center text-slate-950 shadow-lg shadow-sky-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                5-Band Equalizer & DSP
                {equalizer.enabled && (
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30">
                    Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-medium">Fine-tune frequencies & audio dynamics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Enable & Preamp Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={equalizer.enabled}
                onChange={(e) => setEqualizerEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-sky-400 peer-checked:to-blue-600"></div>
            </label>
            <span className="text-xs font-bold text-slate-200">
              {equalizer.enabled ? "Equalizer Enabled" : "Equalizer Bypassed"}
            </span>
          </div>

          {/* Preamp Gain */}
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-400">Preamp:</span>
            <input
              type="range"
              min="-6"
              max="6"
              step="0.5"
              disabled={!equalizer.enabled}
              value={equalizer.preamp || 0}
              onChange={(e) => setEqualizerPreamp(parseFloat(e.target.value))}
              className="w-20 sm:w-24 accent-sky-400 h-1.5 rounded-lg bg-slate-800 cursor-pointer disabled:opacity-40"
            />
            <span className="text-xs font-mono font-bold text-sky-300 w-10 text-right">
              {equalizer.preamp > 0 ? `+${equalizer.preamp}` : equalizer.preamp}dB
            </span>
          </div>
        </div>

        {/* Preset Selector Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Audio Presets
            </span>
            <button
              onClick={() => setEqualizerPreset("flat")}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {(Object.keys(EQUALIZER_PRESETS) as EqualizerPresetName[]).map((presetKey) => {
              const isSelected = equalizer.preset === presetKey;
              return (
                <button
                  key={presetKey}
                  onClick={() => setEqualizerPreset(presetKey)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center border ${
                    isSelected
                      ? "bg-gradient-to-r from-sky-500/20 to-blue-600/20 border-sky-400/60 text-white shadow-md shadow-sky-500/10"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {EQUALIZER_PRESETS[presetKey].name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Band Vertical Sliders */}
        <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800/80 space-y-4">
          <div className="grid grid-cols-5 gap-2 sm:gap-4 items-end justify-items-center h-52 pt-2">
            {BAND_LABELS.map(({ key, label, desc }) => {
              const val = equalizer.bands[key] || 0;
              return (
                <div key={key} className="flex flex-col items-center justify-between h-full w-full">
                  {/* dB readout */}
                  <span className="text-[11px] font-mono font-bold text-sky-400">
                    {val > 0 ? `+${val}` : val}
                  </span>

                  {/* Vertical Range Slider */}
                  <div className="relative flex items-center justify-center h-28 my-1">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      disabled={!equalizer.enabled}
                      value={val}
                      onChange={(e) => setEqualizerBand(key, parseInt(e.target.value, 10))}
                      className="accent-sky-400 h-1.5 w-28 -rotate-90 rounded-lg bg-slate-800 cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  {/* Label & Description */}
                  <div className="text-center pt-2">
                    <div className="text-[11px] font-bold text-white whitespace-nowrap">{label}</div>
                    <div className="text-[9px] text-slate-500 hidden sm:block whitespace-nowrap">{desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
