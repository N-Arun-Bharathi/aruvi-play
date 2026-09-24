import React from "react";
import { usePlayerStore } from "../store/playerStore";
import { SleepTimerOption } from "@aruvi/shared";
import { Moon, X, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS: Array<{ id: SleepTimerOption; label: string; desc: string }> = [
  { id: "5", label: "5 Minutes", desc: "Quick power nap or pause" },
  { id: "15", label: "15 Minutes", desc: "Short wind-down session" },
  { id: "30", label: "30 Minutes", desc: "Standard bedtime timer" },
  { id: "45", label: "45 Minutes", desc: "Deep sleep transition" },
  { id: "60", label: "1 Hour", desc: "Extended bedtime playlist" },
  { id: "end_of_track", label: "End of This Track", desc: "Stops when current song finishes" },
];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const { sleepTimer, setSleepTimer, cancelSleepTimer } = usePlayerStore();

  if (!isOpen) return null;

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSelectOption = (opt: SleepTimerOption) => {
    setSleepTimer(opt);
    onClose();
  };

  const handleCancel = () => {
    cancelSleepTimer();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-500/15 backdrop-blur-2xl space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-sky-500/20">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Sleep Timer
              </h2>
              <p className="text-xs text-slate-400 font-medium">Automatic fade-out & pause</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Timer Countdown Banner */}
        {sleepTimer.active && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/15 via-blue-600/15 to-indigo-600/15 border border-sky-400/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-sky-400 animate-pulse" />
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">
                  Active Sleep Timer
                </span>
                <span className="text-sm font-black text-white">
                  {sleepTimer.durationMinutes === "end_of_track"
                    ? "Stopping at end of current track"
                    : `${formatRemaining(sleepTimer.remainingSeconds)} remaining`}
                </span>
              </div>
            </div>

            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all"
            >
              Turn Off
            </button>
          </div>
        )}

        {/* Option List */}
        <div className="space-y-2">
          {TIMER_OPTIONS.map((opt) => {
            const isSelected =
              sleepTimer.active &&
              (opt.id === "end_of_track"
                ? sleepTimer.durationMinutes === "end_of_track"
                : sleepTimer.durationMinutes === parseInt(opt.id, 10));

            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-slate-800/90 border-sky-400/60 shadow-md shadow-sky-500/10 text-white"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/50"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white mb-0.5">{opt.label}</div>
                  <div className="text-[11px] text-slate-400">{opt.desc}</div>
                </div>

                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700" />
                )}
              </button>
            );
          })}
        </div>

        {/* Gentle Fade-Out Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 text-[11px] text-slate-400">
          <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            Music will gently fade down to silence during the last 10 seconds before pausing.
          </span>
        </div>
      </div>
    </div>
  );
};
