import { AlertTriangle, TrendingDown, Users, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BriefData {
  date: string;
  total_appointments: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  revenue_at_risk: number;
  avg_risk_score: number;
}

export function MorningBriefCard({ data }: { data: BriefData }) {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Morning Briefing
        </p>
        <h2 className="text-lg font-semibold mt-0.5">
          {new Date(data.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
        <p className="text-sm text-slate-400">{clinicName}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-b">
        <Stat icon={Users} label="Total Appts" value={String(data.total_appointments)} />
        <Stat
          icon={AlertTriangle}
          label="High Risk"
          value={String(data.high_risk_count)}
          danger={data.high_risk_count > 0}
        />
        <Stat
          icon={TrendingDown}
          label="Avg Risk Score"
          value={`${Math.round(data.avg_risk_score * 100)}%`}
        />
        <Stat
          icon={DollarSign}
          label="Revenue at Risk"
          value={formatCurrency(data.revenue_at_risk)}
          danger={data.revenue_at_risk > 0}
        />
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-red-600">{data.high_risk_count} high-risk</span>,{" "}
          <span className="font-medium text-amber-600">
            {data.medium_risk_count} medium-risk
          </span>
          , and{" "}
          <span className="font-medium text-green-600">{data.low_risk_count} low-risk</span>{" "}
          appointments today. Estimated{" "}
          <span className="font-medium">{formatCurrency(data.revenue_at_risk)}</span> at risk from
          potential no-shows.
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xl font-bold ${danger ? "text-red-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
