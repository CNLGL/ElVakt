"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import { PriceRecord } from "../types";

interface PriceChartProps {
  data: PriceRecord[];
}

export default function PriceChart({ data }: PriceChartProps) {
  const prices = data.map(d => d.price);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const chartData = data.map((item) => ({
    timestamp: new Date(item.start_time).getTime(),
    displayTime: new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    price: item.price
  }));

  // Saatleri 2 saat aralıklarla gösteriyoruz (0,2,4,...22)
  const tickHours = Array.from({ length: 12 }, (_, i) =>
    `${(i*2).toString().padStart(2,"0")}:00`
  );

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 20, right: 40, left: 40, bottom: 20 }}>
          <CartesianGrid stroke="#AAAAAA" strokeDasharray="3 3" opacity={0.1} />

          <XAxis
            dataKey="displayTime"
            type="category"
            ticks={tickHours}  // 2 saat aralıkları
            tick={{ fill: "#888888", fontSize: 12 }}
          />

          <YAxis
            tick={{ fill: "#888888", fontSize: 12 }}
          />

          <Tooltip
            contentStyle={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #E5E5E5" }}
            formatter={(value: number) => {
              let color = "#888888";
              if (value > avgPrice) color = "red";
              else if (value < avgPrice) color = "blue";
              return <span style={{ color }}>{value.toFixed(3)} SEK</span>;
            }}
            labelFormatter={(t) => t} 
          />

          <Line
            type="monotone"
            dataKey="price"
            stroke="#555555"
            strokeWidth={2}
            dot={{ stroke: "#555555", strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: "#000", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}