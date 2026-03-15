import { useNavigate } from "react-router-dom";
import ProgressTracker from "../components/Pipeline/ProgressTracker";
import { ViewHeader } from "../components/Layout";
import { useLectureStore } from "../stores";
import { Button } from "@/components/ui/button";

export default function Pipeline() {
  const navigate = useNavigate();
  const { currentLectureId, lectures } = useLectureStore();

  const currentLecture = lectures.find((l) => l.id === currentLectureId) ?? null;

  const handlePipelineComplete = () => {
    if (currentLectureId) {
      useLectureStore.getState().updateLecture(currentLectureId, { status: "complete" });
    }
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <ViewHeader
        title="Processing Knowte"
        description={
          currentLecture
            ? `Generating AI content for "${currentLecture.filename}"…`
            : "Running AI pipeline…"
        }
      />

      {currentLectureId ? (
        <ProgressTracker
          lectureId={currentLectureId}
          onPipelineComplete={handlePipelineComplete}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-muted-foreground shadow-sm">
          No knowte selected. Please add and process a knowte first.
        </div>
      )}

      {/* Navigation shortcuts */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          variant="secondary"
          type="button"
          onClick={() => currentLectureId && navigate(`/lecture/${currentLectureId}/notes`)}
          disabled={!currentLectureId}
        >
          View Notes
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => currentLectureId && navigate(`/lecture/${currentLectureId}/quiz`)}
          disabled={!currentLectureId}
        >
          View Quiz
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => currentLectureId && navigate(`/lecture/${currentLectureId}/flashcards`)}
          disabled={!currentLectureId}
        >
          View Flashcards
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => currentLectureId && navigate(`/lecture/${currentLectureId}/mindmap`)}
          disabled={!currentLectureId}
        >
          View Mind Map
        </Button>
      </div>
    </div>
  );
}
