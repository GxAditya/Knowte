import { PERSONALIZATION_LEVELS } from "../../lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "../ui/label";

export default function PersonalizationConfig({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-muted-foreground">
        Personalization Level
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select level" />
        </SelectTrigger>
        <SelectContent>
          {PERSONALIZATION_LEVELS.map((level) => (
            <SelectItem key={level.value} value={level.value}>
              {level.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Adjusts explanation complexity for your learning level
      </p>
    </div>
  );
}
