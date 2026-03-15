import { Badge } from "@/components/ui/badge";

interface StageIndicatorProps {
  label: string;
}

export default function StageIndicator({ label }: StageIndicatorProps) {
  return (
    <Badge variant="outline" className="bg-info/10 text-info border-info/20">
      {label}
    </Badge>
  );
}
