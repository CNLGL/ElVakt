"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DeviceReading } from "../types";

interface DeviceChartProps {
  data: DeviceReading[];
}

export default function DeviceChart({ data }: DeviceChartProps) {
  const chartData = data.map((item) => ({
    displayTime: new Date(item.measured_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    power: item.power_watts,
    cost: item.cost_sek ?? 0,
  }));

  return (
    <div className="h-[360px] w-full sm:h-[420px]">
      <ResponsiveContainer>
        <AreaChart
          data={chartData}
          margin={{ top: 16, right: 12, left: -12, bottom: 8 }}
        >
          <CartesianGrid
            stroke="rgba(15, 23, 42, 0.08)"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="displayTime"
            tick={{ fill: "#52606d", fontSize: 12 }}
            tickFormatter={(value) => {
              const hour = Number(value.split(":")[0]);
              return hour % 4 === 0 ? value : "";
            }}
          />
          <YAxis tick={{ fill: "#52606d", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
            }}
            formatter={(value, name) => {
              const numericValue =
                typeof value === "number" ? value : Number(value ?? 0);

              if (name === "cost") {
                return (
                  <span style={{ color: "#334155" }}>
                    {numericValue.toFixed(3)} SEK
                  </span>
                );
              }

              return (
                <span style={{ color: "#0f766e" }}>
                  {numericValue.toFixed(0)} W
                </span>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="power"
            stroke="#0f766e"
            fill="rgba(15, 118, 110, 0.14)"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
