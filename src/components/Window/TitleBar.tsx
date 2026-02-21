import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useState } from "react";
import appIcon from "../../assets/cognote-icon.svg";
import type { ThemeMode } from "../../lib/types";

interface TitleBarProps {
  currentViewLabel: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export default function TitleBar({
  currentViewLabel,
  theme,
  onToggleTheme,
}: TitleBarProps) {
  const isNative = isTauri();
  const nativeWindow = useMemo(
    () => (isNative ? getCurrentWindow() : null),
    [isNative],
  );
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!nativeWindow) {
      return;
    }

    let isMounted = true;
    let unlistenResized: (() => void) | null = null;

    const syncMaximized = async () => {
      const maximized = await nativeWindow.isMaximized();
      if (isMounted) {
        setIsMaximized(maximized);
      }
    };

    void syncMaximized();

    void nativeWindow.onResized(() => {
      void syncMaximized();
    }).then((unlisten) => {
      unlistenResized = unlisten;
    });

    return () => {
      isMounted = false;
      unlistenResized?.();
    };
  }, [nativeWindow]);

  const handleMinimize = useCallback(async () => {
    if (!nativeWindow) {
      return;
    }
    try {
      await nativeWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize window:", error);
    }
  }, [nativeWindow]);

  const handleToggleMaximize = useCallback(async () => {
    if (!nativeWindow) {
      return;
    }
    try {
      await nativeWindow.toggleMaximize();
      setIsMaximized(await nativeWindow.isMaximized());
    } catch (error) {
      console.error("Failed to toggle maximize:", error);
    }
  }, [nativeWindow]);

  const handleClose = useCallback(async () => {
    if (!nativeWindow) {
      return;
    }
    try {
      await nativeWindow.close();
    } catch (error) {
      console.error("Failed to close window:", error);
    }
  }, [nativeWindow]);

  return (
    <header className="flex h-11 items-center justify-between border-b border-slate-300/90 bg-slate-100/90 px-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex min-w-0 items-center gap-2" data-tauri-drag-region>
        <img src={appIcon} alt="Cognote app icon" className="h-5 w-5 shrink-0" />
        <div className="min-w-0 leading-tight" data-tauri-drag-region>
          <p className="truncate text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-200">
            COGNOTE
          </p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {currentViewLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white/70 text-slate-600 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M12 4.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V5.25A.75.75 0 0 1 12 4.5zm0 12a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75zm7.5-4.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75zM8.25 12a.75.75 0 0 1-.75.75H6a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75zm7.273-4.773a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06zM6.297 16.453a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06zm11.346 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06zM8.417 7.227a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06zM12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5z" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M12.996 2a.75.75 0 0 1 .721.954 8.25 8.25 0 1 0 7.33 10.323.75.75 0 0 1 1.423-.073A9.75 9.75 0 1 1 12.275 2.279a.75.75 0 0 1 .721-.279z" />
            </svg>
          )}
        </button>

        {isNative && (
          <div className="ml-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handleMinimize()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white/70 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Minimize window"
            >
              <span aria-hidden="true">-</span>
            </button>
            <button
              type="button"
              onClick={() => void handleToggleMaximize()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white/70 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label={isMaximized ? "Restore window" : "Maximize window"}
            >
              <span aria-hidden="true">{isMaximized ? "▢" : "□"}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleClose()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-300 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:border-red-800 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25"
              aria-label="Close window"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
