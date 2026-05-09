import type { PrepInstruction } from "@/types";
import { CheckCircle } from "lucide-react";

interface PrepTimelineProps {
  instruction: PrepInstruction;
}

export function PrepTimeline({ instruction }: PrepTimelineProps) {
  return (
    <div className="space-y-6">
      <Stage title="One Week Before" items={instruction.one_week_before} color="blue" />
      <Stage title="Two Days Before" items={instruction.two_days_before} color="amber" />
    </div>
  );
}

function Stage({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: "blue" | "amber";
}) {
  const headerClass =
    color === "blue"
      ? "bg-blue-50 border-blue-200 text-blue-800"
      : "bg-amber-50 border-amber-200 text-amber-800";

  const dotClass = color === "blue" ? "text-blue-500" : "text-amber-500";

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className={`px-4 py-2 font-medium text-sm border-b ${headerClass}`}>{title}</div>
      <ul className="divide-y">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm text-gray-700">
            <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${dotClass}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
