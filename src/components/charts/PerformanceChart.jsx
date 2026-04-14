import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export default function PerformanceChart({ data }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(148, 163, 184, 0.22)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-gray-500 dark:text-zinc-400"
          />
          <Radar
            dataKey="value"
            stroke="#24ac5f"
            fill="#24ac5f"
            fillOpacity={0.45}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
