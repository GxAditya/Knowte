import { useMemo } from "react";
import { useSettingsStore } from "../../stores";
import { WHISPER_MODELS } from "../../lib/types";

interface ModelSelectorProps {
  ollamaUrl: string;
  llmModel: string;
  whisperModel: string;
  onLlmModelChange: (value: string) => void;
  onWhisperModelChange: (value: string) => void;
}

const toModelFileName = (modelSize: string) => `ggml-${modelSize}.bin`;

export default function ModelSelector({
  ollamaUrl,
  llmModel,
  whisperModel,
  onLlmModelChange,
  onWhisperModelChange,
}: ModelSelectorProps) {
  const {
    ollamaStatus,
    whisperModelsOnDisk,
    whisperDownloadingModel,
    whisperDownloadProgress,
    whisperError,
    checkOllama,
    downloadWhisperModel,
  } = useSettingsStore();

  const isConnected = ollamaStatus?.connected ?? false;
  const llmModels = ollamaStatus?.models ?? [];
  const downloadedModelSet = useMemo(
    () => new Set(whisperModelsOnDisk),
    [whisperModelsOnDisk],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${
            isConnected ? "bg-[var(--color-success)]" : "bg-[var(--color-error)]"
          }`}
          title={isConnected ? "Connected to Ollama" : "Not connected to Ollama"}
        />
        <span className="text-sm text-[var(--text-secondary)]">
          {isConnected ? "Connected to Ollama" : "Ollama not reachable"}
        </span>
        <button
          type="button"
          onClick={() => void checkOllama(ollamaUrl)}
          className="text-xs text-[var(--accent-primary)] hover:text-[var(--color-info)]"
        >
          Refresh
        </button>
      </div>

      {!isConnected && ollamaStatus?.error && (
        <p className="text-xs text-[var(--color-error)]">{ollamaStatus.error}</p>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">LLM Model</label>
        <select
          value={llmModel}
          onChange={(event) => onLlmModelChange(event.target.value)}
          disabled={!isConnected}
          className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isConnected ? (
            llmModels.length > 0 ? (
              llmModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))
            ) : (
              <option value="">No models available</option>
            )
          ) : (
            <option value={llmModel}>{llmModel || "Select model"}</option>
          )}
        </select>
        {!isConnected && (
          <p className="text-xs text-[var(--text-muted)]">
            Start Ollama to refresh available models.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Whisper Model
        </label>
        <select
          value={whisperModel}
          onChange={(event) => onWhisperModelChange(event.target.value)}
          className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        >
          {WHISPER_MODELS.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-overlay)] p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Whisper Models</h3>
          <span className="text-xs text-[var(--text-muted)]">Stored in `src-tauri/whisper-models`</span>
        </div>

        <div className="space-y-2">
          {WHISPER_MODELS.map((model) => {
            const fileName = toModelFileName(model.value);
            const isDownloaded = downloadedModelSet.has(fileName);
            const isDownloading = whisperDownloadingModel === model.value;

            return (
              <div
                key={model.value}
                className="flex items-center justify-between rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2"
              >
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">{model.value}</p>
                  <p className="text-xs text-[var(--text-muted)]">{fileName}</p>
                </div>

                {isDownloaded ? (
                  <span className="rounded-full bg-[var(--color-success-muted)] px-3 py-1 text-xs text-[var(--color-success)]">
                    Downloaded
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void downloadWhisperModel(model.value)}
                    disabled={Boolean(whisperDownloadingModel)}
                    className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDownloading ? "Downloading..." : "Download"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {whisperDownloadingModel && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Downloading {whisperDownloadingModel}</span>
              <span>{Math.round(whisperDownloadProgress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-[var(--bg-elevated)]">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all"
                style={{ width: `${whisperDownloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {whisperError && <p className="text-xs text-[var(--color-error)]">{whisperError}</p>}
      </div>
    </div>
  );
}
