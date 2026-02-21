import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { SUPPORTED_AUDIO_EXTENSIONS } from "../../lib/constants";
import { acceptAudioFile, pickAudioFiles } from "../../lib/tauriApi";
import type { AudioFileMetadata } from "../../lib/types";

interface DropZoneProps {
  onUploadSuccess: (metadata: AudioFileMetadata[]) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
  disabled?: boolean;
}

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export default function DropZone({
  onUploadSuccess,
  onUploadStateChange,
  disabled = false,
}: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFilePaths = async (filePaths: string[]) => {
    const uniquePaths = Array.from(new Set(filePaths)).filter((path) => path.trim().length > 0);
    if (disabled || isProcessing || uniquePaths.length === 0) {
      return;
    }

    setError(null);
    setIsProcessing(true);
    setUploadProgress(0);
    onUploadStateChange?.(true);

    const imported: AudioFileMetadata[] = [];
    const failures: string[] = [];

    try {
      for (let index = 0; index < uniquePaths.length; index += 1) {
        const path = uniquePaths[index];
        try {
          const metadata = await acceptAudioFile(path);
          imported.push(metadata);
        } catch (uploadError) {
          failures.push(formatError(uploadError));
        } finally {
          setUploadProgress(Math.round(((index + 1) / uniquePaths.length) * 100));
        }
      }

      if (imported.length > 0) {
        onUploadSuccess(imported);
      }

      if (failures.length > 0) {
        if (imported.length > 0) {
          setError(
            `Imported ${imported.length} of ${uniquePaths.length} files. First error: ${failures[0]}`,
          );
        } else {
          setError(failures[0]);
        }
      }
    } catch (uploadError) {
      setError(formatError(uploadError));
    } finally {
      setIsProcessing(false);
      onUploadStateChange?.(false);
      setIsDragActive(false);
    }
  };

  const handleBrowseClick = async () => {
    if (disabled || isProcessing) {
      return;
    }

    setError(null);
    try {
      const selectedPaths = await pickAudioFiles();
      if (selectedPaths.length === 0) {
        return;
      }
      await handleFilePaths(selectedPaths);
    } catch (pickError) {
      setError(formatError(pickError));
    }
  };

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let isMounted = true;
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await getCurrentWindow().onDragDropEvent((event) => {
        if (!isMounted || disabled || isProcessing) {
          return;
        }

        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragActive(true);
          return;
        }

        if (event.payload.type === "leave") {
          setIsDragActive(false);
          return;
        }

        if (event.payload.type === "drop") {
          const droppedPaths = event.payload.paths;
          if (droppedPaths.length > 0) {
            void handleFilePaths(droppedPaths);
          } else {
            setIsDragActive(false);
          }
        }
      });
    };

    void setupListener();

    return () => {
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [disabled, isProcessing]);

  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border-2 border-dashed p-10 text-center shadow-sm ${
          isDragActive
            ? "dropzone-drag-active border-blue-500 bg-blue-500/10"
            : "border-slate-600 bg-slate-800/40"
        }`}
      >
        <h3 className="text-lg font-semibold text-slate-100">
          Drag and drop lecture files
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Supported: {SUPPORTED_AUDIO_EXTENSIONS.join(", ")}
        </p>
        <button
          type="button"
          onClick={() => void handleBrowseClick()}
          disabled={disabled || isProcessing}
          className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? "Importing..." : "Browse files"}
        </button>

        {isProcessing && (
          <div className="mt-5 space-y-1">
            <div className="h-2 overflow-hidden rounded-md bg-slate-700/70">
              <div className="h-full bg-blue-500" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-xs text-slate-400">{Math.round(uploadProgress)}%</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
