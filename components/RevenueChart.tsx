"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { MOCK_REVENUE_DATA } from "@/lib/mock-data";

interface RevenueChartProps {
  data?: typeof MOCK_REVENUE_DATA;
}

export function RevenueChart({ data = MOCK_REVENUE_DATA }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorBefore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorAfter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="before"
          name="Before (baseline)"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#colorBefore)"
        />
        <Area
          type="monotone"
          dataKey="after"
          name="After (with No-Show AI)"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#colorAfter)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
