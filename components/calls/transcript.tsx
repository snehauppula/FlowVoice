import { cn } from "@/lib/utils";
import type { TranscriptTurn } from "@/lib/providers/voice/types";

function mmss(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function Transcript({ turns }: { turns: TranscriptTurn[] }) {
  if (!turns.length) return <p className="text-muted">No transcript was recorded for this call.</p>;
  return (
    <ol className="space-y-2" aria-label="Transcript">
      {turns.map((t, i) => (
        <li key={i} className={cn("flex gap-3 rounded-md p-2", t.speaker === "employee" ? "bg-accent-soft/60" : "")}>
          <span className="w-12 shrink-0 text-muted tabular-nums">{mmss(t.at_ms)}</span>
          <span className="w-20 shrink-0 font-semibold">{t.speaker === "employee" ? "Employee" : "Caller"}</span>
          <span className="min-w-0 break-words">{t.text}</span>
        </li>
      ))}
    </ol>
  );
}
