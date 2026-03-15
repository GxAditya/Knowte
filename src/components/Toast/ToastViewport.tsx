import { useCallback, useEffect, useRef, useState } from "react";
import { useToastStore } from "../../stores";
import type { ToastItem, ToastKind } from "../../stores/toastStore";

const AUTO_DISMISS_MS = 5000;
const EXIT_DURATION_MS = 380;

// ─── Per-kind config ──────────────────────────────────────────────────────────

const KIND_CONFIG: Record<
  ToastKind,
  { icon: string; accentVar: string; mutedVar: string; label: string }
> = {
  success: {
    icon: "✓",
    accentVar: "var(--color-success)",
    mutedVar: "var(--color-success-subtle)",
    label: "Success",
  },
  warning: {
    icon: "⚠",
    accentVar: "var(--color-warning)",
    mutedVar: "var(--color-warning-subtle)",
    label: "Warning",
  },
  error: {
    icon: "✕",
    accentVar: "var(--color-error)",
    mutedVar: "var(--color-error-subtle)",
    label: "Error",
  },
  info: {
    icon: "i",
    accentVar: "var(--color-info)",
    mutedVar: "var(--color-info-subtle)",
    label: "Info",
  },
};

// ─── Single toast ─────────────────────────────────────────────────────────────

interface SingleToastProps {
  toast: ToastItem;
  isExiting: boolean;
  onDismiss: (id: string) => void;
}

function SingleToast({ toast, isExiting, onDismiss }: SingleToastProps) {
  const cfg = KIND_CONFIG[toast.kind];
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Animate the progress bar countdown
  useEffect(() => {
    if (isExiting) return;

    const animate = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isExiting]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={isExiting ? "toast-exit" : "toast-enter"}
      style={{ willChange: "transform, opacity" }}
    >
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="toast-card group"
        style={{
          borderLeft: `3px solid ${cfg.accentVar}`,
        }}
        aria-label={`${cfg.label}: ${toast.message}. Click to dismiss.`}
      >
        {/* Header row */}
        <div className="flex items-center gap-2.5">
          {/* Icon badge */}
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: cfg.accentVar, color: "#fff" }}
          >
            {cfg.icon}
          </span>

          {/* Title */}
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: cfg.accentVar }}
          >
            {toast.title ?? cfg.label}
          </span>

          {/* Dismiss hint */}
          <span className="ml-auto text-[10px] opacity-0 transition-opacity duration-200 group-hover:opacity-40"
            style={{ color: "var(--text-muted)" }}>
            dismiss
          </span>
        </div>

        {/* Message */}
        <p className="mt-2 text-[13px] leading-relaxed text-left"
          style={{ color: "var(--text-secondary)" }}>
          {toast.message}
        </p>

        {/* Progress bar */}
        <div
          className="toast-progress-track"
          style={{ background: cfg.mutedVar }}
        >
          <div
            className="toast-progress-bar"
            style={{
              width: `${progress}%`,
              background: cfg.accentVar,
            }}
          />
        </div>
      </button>
    </div>
  );
}

// ─── Viewport ─────────────────────────────────────────────────────────────────

export default function ToastViewport() {
  const { toasts, dismissToast } = useToastStore();
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback(
    (id: string) => {
      setExitingIds((prev) => new Set([...prev, id]));
      window.setTimeout(() => {
        dismissToast(id);
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, EXIT_DURATION_MS);
    },
    [dismissToast],
  );

  // Auto-dismiss timer — fires handleDismiss so exit animation plays
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts
      .filter((t) => !exitingIds.has(t.id))
      .map((toast) =>
        window.setTimeout(() => handleDismiss(toast.id), AUTO_DISMISS_MS),
      );

    return () => timers.forEach(window.clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts.map((t) => t.id).join(",")]);

  if (toasts.length === 0 && exitingIds.size === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col-reverse gap-2.5"
      aria-label="Notifications"
      role="region"
    >
      {toasts.map((toast) => (
        <SingleToast
          key={toast.id}
          toast={toast}
          isExiting={exitingIds.has(toast.id)}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
