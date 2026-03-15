import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface TranscriptAudioPlayerProps {
  lectureFilename: string;
  sourceUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  disabledReason?: string | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2] as const;

const formatTimestamp = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const wholeSeconds = Math.floor(safeSeconds);
  const minutes = Math.floor(wholeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (wholeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

export default function TranscriptAudioPlayer({
  lectureFilename,
  sourceUrl,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  disabledReason,
  onTogglePlay,
  onSeek,
  onPlaybackRateChange,
}: TranscriptAudioPlayerProps) {
  const isDisabled = sourceUrl === null;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Math.min(Math.max(currentTime, 0), safeDuration || currentTime || 0);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <footer
      className="fixed bottom-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ left: "var(--app-sidebar-width, 16rem)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Now Playing</p>
            <p className="max-w-xs truncate text-xs text-muted-foreground md:max-w-md">
              {lectureFilename}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onTogglePlay}
              disabled={isDisabled}
            >
              {isPlaying ? "Pause" : "Play"}
            </Button>

            <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-1">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onPlaybackRateChange(rate)}
                  className={`rounded px-2 py-1 text-xs transition-colors ${playbackRate === rate
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="min-w-12 text-xs text-muted-foreground">{formatTimestamp(safeCurrentTime)}</span>
          <Slider
            min={0}
            max={safeDuration || 0}
            step={0.1}
            value={[safeCurrentTime]}
            onValueChange={(val) => onSeek(val[0])}
            disabled={isDisabled || safeDuration <= 0}
            className="w-full"
          />
          <span className="min-w-12 text-right text-xs text-muted-foreground">
            {formatTimestamp(safeDuration)}
          </span>
        </div>

        {isDisabled && (
          <p className="text-xs text-muted-foreground">
            {disabledReason ?? "Audio source is unavailable for this knowte."}
          </p>
        )}
      </div>
    </footer>,
    document.body,
  );
}
