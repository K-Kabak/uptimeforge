"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
export function ResponseChart({
  data,
}: {
  data: { time: string; duration: number }[];
}) {
  if (!data.length)
    return <p className="py-8 opacity-60">No response-time data yet.</p>;
  return (
    <div
      className="h-64 min-w-0"
      role="img"
      aria-label="Response time in milliseconds"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="time"
            tickFormatter={(v) =>
              new Date(v).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />
          <YAxis unit="ms" />
          <Tooltip
            labelFormatter={(v) => new Date(String(v)).toLocaleString()}
          />
          <Line
            type="monotone"
            dataKey="duration"
            stroke="#059669"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
