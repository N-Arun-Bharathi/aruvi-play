import { create } from "zustand";

export interface ToastMessage {
  id: string;
  message: string;
  type?: "info" | "success" | "error";
}

interface ToastState {
  toasts: ToastMessage[];
  show: (message: string, type?: "info" | "success" | "error") => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message: string, type: "info" | "success" | "error" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  remove: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
