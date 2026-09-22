import React from "react";
import { useToastStore } from "../store/toastStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border text-sm font-medium transition-all duration-300 animate-slide-in ${
            toast.type === "success"
              ? "bg-gradient-to-r from-slate-900/95 to-slate-800/95 text-slate-100 border-[#38bdf8]/40 shadow-[#38bdf8]/10"
              : toast.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-500/30"
              : "bg-slate-900/95 text-slate-100 border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-[#38bdf8] shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-[#38bdf8] shrink-0" />}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => remove(toast.id)}
            className="text-slate-400 hover:text-white p-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
