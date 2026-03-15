import { useMemo } from "react";
import { useSettingsStore } from "../../stores";
import { WHISPER_MODELS } from "../../lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { RefreshCw, Download, CheckCircle2, AlertCircle } from "lucide-react";

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
    <div className="space-y-6">
      {/* Ollama Connection Status */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-sm font-medium">
            {isConnected ? "Connected to Ollama" : "Ollama not reachable"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => void checkOllama(ollamaUrl)}
          className="h-8 gap-1.5 text-xs text-primary"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      {!isConnected && ollamaStatus?.error && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {ollamaStatus.error}
        </div>
      )}

      {/* Models Selection */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>LLM Model</Label>
          <Select
            value={llmModel}
            onValueChange={onLlmModelChange}
            disabled={!isConnected}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isConnected ? "Select model" : "Ollama offline"} />
            </SelectTrigger>
            <SelectContent>
              {llmModels.length > 0 ? (
                llmModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="..." disabled>No models found</SelectItem>
              )}
            </SelectContent>
          </Select>
          {!isConnected && (
            <p className="text-[10px] text-muted-foreground">
              Start Ollama to refresh available models.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Whisper Model</Label>
          <Select
            value={whisperModel}
            onValueChange={onWhisperModelChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {WHISPER_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Whisper Models Management */}
      <Card className="overflow-hidden border-border bg-muted/20">
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Whisper Models</CardTitle>
              <CardDescription className="text-[10px]">Stored in `src-tauri/whisper-models`</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="grid gap-2">
            {WHISPER_MODELS.map((model) => {
              const fileName = toModelFileName(model.value);
              const isDownloaded = downloadedModelSet.has(fileName);
              const isDownloading = whisperDownloadingModel === model.value;

              return (
                <div
                  key={model.value}
                  className="flex items-center justify-between rounded-md border bg-card/50 px-3 py-2 text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium">{model.value}</p>
                    <p className="text-[10px] text-muted-foreground">{fileName}</p>
                  </div>

                  {isDownloaded ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                      Downloaded
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => void downloadWhisperModel(model.value)}
                      disabled={Boolean(whisperDownloadingModel)}
                      className="h-7 px-3 text-xs"
                    >
                      {isDownloading ? (
                        "Downloading..."
                      ) : (
                        <>
                          <Download className="mr-1.5 h-3 w-3" />
                          Download
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {whisperDownloadingModel && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Spinner className="size-3" />
                  Downloading {whisperDownloadingModel}...
                </span>
                <span className="font-medium text-foreground">{Math.round(whisperDownloadProgress)}%</span>
              </div>
              <Progress value={whisperDownloadProgress} className="h-1.5" />
            </div>
          )}

          {whisperError && (
            <p className="rounded bg-destructive/10 p-2 text-xs text-destructive">
              {whisperError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
