import { cn } from "@/lib/utils";
import type { RiskScore } from "@/types";

interface RiskBadgeProps {
  level: RiskScore["risk_level"];
  score?: number;
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const styles = {
    low: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    high: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        styles[level]
      )}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full", {
          "bg-green-500": level === "low",
          "bg-amber-500": level === "medium",
          "bg-red-500": level === "high",
        })}
      />
      {level.charAt(0).toUpperCase() + level.slice(1)}
      {score !== undefined && (
        <span className="ml-0.5 opacity-70">({Math.round(score * 100)}%)</span>
      )}
    </span>
  );
}
