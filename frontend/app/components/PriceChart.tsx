"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PriceRecord } from "../types";

interface PriceChartProps {
  data: PriceRecord[];
}

interface ChartPoint {
  displayTime: string;
  price: number;
  startTime: string;
  endTime: string;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
}

function formatPrice(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
  return numericValue.toFixed(5);
}

export default function PriceChart({ data }: PriceChartProps) {
  const prices = data.map((entry) => entry.price);
  const avgPrice = prices.length
    ? prices.reduce((sum, value) => sum + value, 0) / prices.length
    : 0;

  const now = new Date();

  const chartData: ChartPoint[] = data.map((item) => {
    const startDate = new Date(item.start_time);

    return {
      displayTime: startDate.toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Stockholm",
      }),
      price: item.price,
      startTime: item.start_time,
      endTime: item.end_time,
    };
  });

  return (
    <div className="h-[360px] w-full sm:h-[420px]">
      <ResponsiveContainer>
        <LineChart
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
              const hour = Number(String(value).split(":")[0]);
              return hour % 4 === 0 ? String(value) : "";
            }}
          />

          <YAxis
            tick={{ fill: "#52606d", fontSize: 12 }}
            tickFormatter={(value) => formatPrice(value)}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
            }}
            formatter={(value) => {
              const numericValue =
                typeof value === "number" ? value : Number(value ?? 0);

              const color =
                numericValue > avgPrice
                  ? "#dc2626"
                  : numericValue < avgPrice
                    ? "#0369a1"
                    : "#334155";

              return (
                <span style={{ color }}>
                  {formatPrice(numericValue)} SEK/kWh
                </span>
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="price"
            stroke="#0f766e"
            strokeWidth={3}
            dot={({ cx, cy, payload }: DotProps) => {
              if (cx === undefined || cy === undefined || !payload) {
                return null;
              }

              const start = new Date(payload.startTime);
              const end = new Date(payload.endTime);
              const isCurrentPoint = now >= start && now < end;

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCurrentPoint ? 5 : 2.5}
                  fill={isCurrentPoint ? "#dc2626" : "#ffffff"}
                  stroke={isCurrentPoint ? "#dc2626" : "#0f766e"}
                  strokeWidth={isCurrentPoint ? 2 : 1.5}
                />
              );
            }}
            activeDot={{ r: 6, stroke: "#0f172a", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
