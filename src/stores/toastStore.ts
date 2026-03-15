import { create } from "zustand";
import { toast } from "sonner";

export type ToastKind = "success" | "warning" | "error" | "info";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  title?: string;
  createdAt: number;
}

interface ToastState {
  // We keep the state for compatibility, but pushToast now triggers Sonner
  pushToast: (toastItem: Omit<ToastItem, "id" | "createdAt">) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>(() => ({
  pushToast: (toastItem) => {
    const { kind, message, title } = toastItem;
    
    // Map kind to sonner methods
    const options = {
      description: message,
    };

    switch (kind) {
      case "success":
        return toast.success(title ?? "Success", options).toString();
      case "error":
        return toast.error(title ?? "Error", options).toString();
      case "warning":
        return toast.warning(title ?? "Warning", options).toString();
      case "info":
      default:
        return toast.info(title ?? "Info", options).toString();
    }
  },
  dismissToast: (id) => toast.dismiss(id),
  clearToasts: () => toast.dismiss(),
}));

