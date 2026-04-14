import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ProfileActivityChart({ data }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "currentColor", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            className="text-gray-500 dark:text-zinc-400"
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            className="text-gray-500 dark:text-zinc-400"
          />
          <Tooltip
            cursor={{ fill: "rgba(36, 172, 95, 0.08)" }}
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid rgba(63,63,70,0.5)",
              background: "rgba(9,9,11,0.96)",
              color: "#fff",
            }}
          />
          <Bar dataKey="recommendations" fill="#24ac5f" radius={[10, 10, 0, 0]} />
          <Bar dataKey="purchases" fill="#60a5fa" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
