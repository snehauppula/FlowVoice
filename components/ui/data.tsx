import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wide tables scroll horizontally inside their own container instead of the page. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
      <table className="w-full min-w-[640px] text-left">{children}</table>
    </div>
  );
}

export const Th = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th scope="col" className={cn("border-b border-border bg-surface-muted/60 px-3 py-2.5 text-muted", className)}>{children}</th>
);

export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn("border-b border-border px-3 py-2.5 align-top last:border-b-0", className)}>{children}</td>
);

export function Pagination({
  page, total, pageSize, hrefFor,
}: { page: number; total: number; pageSize: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
      <span className="text-muted">Page {page} of {pages} · {total} total</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="btn-secondary" href={hrefFor(page - 1)}>Previous</Link>}
        {page < pages && <Link className="btn-secondary" href={hrefFor(page + 1)}>Next</Link>}
      </div>
    </nav>
  );
}

type Tone = "muted" | "good" | "bad" | "gold" | "warn";

/** Status pill. The label text always carries the meaning; color only reinforces it. */
export function Tag({ children, tone = "muted" }: { children: React.ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    muted: "border-border-strong bg-surface-muted text-muted",
    good: "border-success/30 bg-success-soft text-success",
    bad: "border-danger/30 bg-danger-soft text-danger",
    warn: "border-warning/30 bg-warning-soft text-warning",
    gold: "border-primary/30 bg-primary-soft text-primary-hover",
  };
  return <span className={cn("inline-block rounded-full border px-2.5 py-0.5 capitalize", tones[tone])}>{children}</span>;
}

export function callTone(status: string): Tone {
  if (status === "completed") return "good";
  if (["failed", "busy", "no_answer", "provider_error", "cancelled"].includes(status)) return "bad";
  return "gold";
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export const fmtDuration = (s: number | null) => (s == null ? "—" : `${Math.floor(s / 60)}m ${s % 60}s`);
