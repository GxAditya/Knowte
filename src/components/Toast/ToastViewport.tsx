import { useEffect } from "react";
import { useToastStore } from "../../stores";

const AUTO_DISMISS_MS = 5000;

const TOAST_STYLES = {
  success: {
    bg: "var(--color-success-muted)",
    border: "var(--color-success)",
    text: "var(--text-primary)",
    badgeBg: "var(--color-success)",
    badgeText: "#fff",
    label: "Success",
  },
  warning: {
    bg: "var(--color-warning-muted)",
    border: "var(--color-warning)",
    text: "var(--text-primary)",
    badgeBg: "var(--color-warning)",
    badgeText: "#fff",
    label: "Warning",
  },
  error: {
    bg: "var(--color-error-muted)",
    border: "var(--color-error)",
    text: "var(--text-primary)",
    badgeBg: "var(--color-error)",
    badgeText: "#fff",
    label: "Error",
  },
  info: {
    bg: "var(--color-info-muted)",
    border: "var(--color-info)",
    text: "var(--text-primary)",
    badgeBg: "var(--color-info)",
    badgeText: "#fff",
    label: "Info",
  },
} as const;

export default function ToastViewport() {
  const { toasts, dismissToast } = useToastStore();

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, dismissToast]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const s = TOAST_STYLES[toast.kind];
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="pointer-events-auto rounded-lg px-4 py-3 text-left shadow-lg backdrop-blur-sm transition-all hover:opacity-95 animate-slide-in-right"
            style={{
              border: `1px solid ${s.border}`,
              background: s.bg,
              color: s.text,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ background: s.badgeBg, color: s.badgeText }}
              >
                {toast.title ?? s.label}
              </span>
              <span className="text-xs opacity-60">Click to dismiss</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{toast.message}</p>
          </button>
        );
      })}
    </div>
  );
}
