"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type DayBucket = { day: string; label: string; completed: number; other: number };

// Hex values mirror --primary and --border-strong in app/globals.css (SVG needs literal colors).
const COMPLETED = "#dd4c5c";
const OTHER = "#e6c3bf";

export function CallActivityChart({ data, summary }: { data: DayBucket[]; summary: string }) {
  return (
    <div role="img" aria-label={summary}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="#f3dbd7" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#735959", fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#735959", fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: "#fff3f1" }}
              contentStyle={{ border: "1px solid #f3dbd7", borderRadius: 12, background: "#fffffd", fontSize: 14, boxShadow: "0 8px 24px rgba(60,22,28,0.12)" }}
              labelStyle={{ color: "#3c161c", fontWeight: 600 }}
            />
            <Bar dataKey="completed" name="Completed" stackId="a" fill={COMPLETED} radius={[0, 0, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="other" name="Not answered / failed" stackId="a" fill={OTHER} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COMPLETED }} />Completed</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: OTHER }} />Not answered / failed</span>
      </div>
    </div>
  );
}
