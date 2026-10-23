import { Tag } from "@/components/ui/data";

const TONE = { draft: "muted", active: "good", paused: "warn", archived: "muted" } as const;

export function StatusBadge({ status }: { status: string }) {
  return <Tag tone={TONE[status as keyof typeof TONE] ?? "muted"}>{status}</Tag>;
}
