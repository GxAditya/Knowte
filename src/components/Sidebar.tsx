import { NavLink } from "react-router-dom";
import appIcon from "../assets/cognote-icon.svg";
import { useLectureStore } from "../stores";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const baseNavItems = [
  { to: "/", label: "Library", end: true, icon: "library" },
  { to: "/upload", label: "Upload", icon: "upload" },
  { to: "/compare", label: "Compare", icon: "compare" },
  { to: "/settings", label: "Settings", icon: "settings" },
] as const;

const lectureNavItems = [
  { segment: "transcript", label: "Transcript", icon: "transcript" },
  { segment: "pipeline", label: "Pipeline", icon: "pipeline" },
  { segment: "notes", label: "Notes", icon: "notes" },
  { segment: "quiz", label: "Quiz", icon: "quiz" },
  { segment: "research", label: "Research", icon: "research" },
  { segment: "mindmap", label: "Mind Map", icon: "mindmap" },
  { segment: "flashcards", label: "Flashcards", icon: "flashcards" },
] as const;

type NavIconName =
  | "library"
  | "upload"
  | "compare"
  | "settings"
  | "transcript"
  | "pipeline"
  | "notes"
  | "quiz"
  | "research"
  | "mindmap"
  | "flashcards";

function NavIcon({ name }: { name: NavIconName }) {
  const iconClass = "h-4 w-4 shrink-0";

  if (name === "library") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h10A2.5 2.5 0 0 1 19 5.5v13A2.5 2.5 0 0 1 16.5 21h-10A2.5 2.5 0 0 1 4 18.5z" />
        <path d="M8 3v18" />
      </svg>
    );
  }

  if (name === "upload") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 16V5" />
        <path d="M8.5 8.5 12 5l3.5 3.5" />
        <path d="M4 16.5A3.5 3.5 0 0 0 7.5 20h9A3.5 3.5 0 0 0 20 16.5" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z" />
      </svg>
    );
  }

  if (name === "compare") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H11v16H6.5A2.5 2.5 0 0 1 4 17.5z" />
        <path d="M13 4h4.5A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20H13z" />
        <path d="M8 9h1.5M8 13h1.5M14.5 9H16M14.5 13H16" />
      </svg>
    );
  }

  if (name === "transcript") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }

  if (name === "pipeline") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="6" cy="7" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="18" cy="17" r="2" />
        <path d="M7.5 8.5 10.5 10.5M13.5 13.5 16.5 15.5" />
      </svg>
    );
  }

  if (name === "notes") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M7 4h10a2 2 0 0 1 2 2v12l-4 2-4-2-4 2V6a2 2 0 0 1 2-2z" />
        <path d="M9 9h6M9 13h6" />
      </svg>
    );
  }

  if (name === "quiz") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="8" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 4.3 1.8c-.9 1-1.8 1.4-1.8 2.7M12 16.5h.01" />
      </svg>
    );
  }

  if (name === "research") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }

  if (name === "mindmap") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="5" cy="6" r="1.8" />
        <circle cx="19" cy="6" r="1.8" />
        <circle cx="5" cy="18" r="1.8" />
        <circle cx="19" cy="18" r="1.8" />
        <path d="M10.2 10.7 6.6 7.8M13.8 10.7l3.6-2.9M10.2 13.3l-3.6 2.9M13.8 13.3l3.6 2.9" />
      </svg>
    );
  }

  if (name === "flashcards") {
    return (
      <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="5" y="8" width="12" height="9" rx="2" />
        <path d="M8 5h11v9M10 11h4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function navLinkClass(isActive: boolean, isCollapsed: boolean): string {
  return [
    "group flex items-center rounded-md text-sm font-medium transition-all duration-200",
    isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
    isActive
      ? "bg-blue-600 text-white"
      : "text-slate-700 hover:bg-slate-700 hover:text-white dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white",
  ].join(" ");
}

function lectureBadgeClass(isActive: boolean): string {
  return isActive
    ? "bg-blue-500/50 text-white"
    : "bg-slate-200 text-slate-700 group-hover:bg-slate-600 group-hover:text-white dark:bg-slate-700 dark:text-slate-200 dark:group-hover:bg-slate-600";
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const { lectures, currentLectureId } = useLectureStore();
  const currentLecture =
    lectures.find((lecture) => lecture.id === currentLectureId) ?? null;
  const lectureCount = lectures.length;
  const lectureTitle =
    currentLecture?.title?.trim() || currentLecture?.filename || "Selected Lecture";

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-300 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 ${
        isCollapsed ? "w-16" : "w-64"
      } transition-all duration-200`}
      aria-label="Sidebar navigation"
    >
      <div className={`${isCollapsed ? "px-2 py-3" : "p-4"} border-b border-slate-300/90 dark:border-slate-800`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} gap-2`}>
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-2">
              <img src={appIcon} alt="Cognote app icon" className="h-5 w-5 shrink-0" />
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                Cognote
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>

        {!isCollapsed && currentLectureId && (
          <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
            {lectureTitle}
          </p>
        )}
      </div>

      <nav
        className={`${isCollapsed ? "p-2" : "p-3"} flex-1`}
        role="tablist"
        aria-label={currentLectureId ? "Lecture view navigation" : "Primary navigation"}
      >
        {currentLectureId ? (
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/"
                end
                role="tab"
                title="Library"
                className={({ isActive }) => navLinkClass(isActive, isCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    <NavIcon name="library" />
                    {!isCollapsed && (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span>Library</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${lectureBadgeClass(isActive)}`}
                        >
                          {lectureCount}
                        </span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
            {lectureNavItems.map((item) => (
              <li key={item.segment}>
                <NavLink
                  to={`/lecture/${currentLectureId}/${item.segment}`}
                  role="tab"
                  title={item.label}
                  className={({ isActive }) => navLinkClass(isActive, isCollapsed)}
                >
                  <NavIcon name={item.icon} />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink
                to="/compare"
                role="tab"
                title="Compare"
                className={({ isActive }) => navLinkClass(isActive, isCollapsed)}
              >
                <NavIcon name="compare" />
                {!isCollapsed && <span>Compare</span>}
              </NavLink>
            </li>
          </ul>
        ) : (
          <ul className="space-y-1">
            {baseNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  role="tab"
                  title={item.label}
                  className={({ isActive }) => navLinkClass(isActive, isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      <NavIcon name={item.icon} />
                      {!isCollapsed && (
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span>{item.label}</span>
                          {item.to === "/" && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] ${lectureBadgeClass(isActive)}`}
                            >
                              {lectureCount}
                            </span>
                          )}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
