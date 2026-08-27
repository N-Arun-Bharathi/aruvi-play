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
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border border-white/10 text-sm font-medium transition-all duration-300 animate-slide-in ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
              : toast.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-500/30"
              : "bg-zinc-900/95 text-zinc-100 border-zinc-700/50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => remove(toast.id)}
            className="text-zinc-400 hover:text-white p-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
