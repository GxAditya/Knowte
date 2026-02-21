interface StageIndicatorProps {
  label: string;
}

export default function StageIndicator({ label }: StageIndicatorProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-info-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-info)]">
      {label}
    </span>
  );
}
