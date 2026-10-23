import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[24px] leading-8">{title}</h1>
        {description ? <p className="mt-0.5 max-w-2xl text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface p-4 shadow-card", className)} {...props} />;
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base">{children}</h2>
      {aside}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong bg-primary-pale px-6 py-12 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-strong" aria-hidden>
        <Sparkles size={18} />
      </span>
      <h2 className="text-base">{title}</h2>
      <p className="mt-1 max-w-md text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** A short, honest note about what is simulated or not yet available. */
export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" }) {
  return (
    <p
      className={cn(
        "mb-4 rounded-xl border p-3",
        tone === "warning" ? "border-warning/30 bg-warning-soft" : "border-border-strong bg-primary-pale",
      )}
    >
      {children}
    </p>
  );
}

/** Marks functionality that runs on mock data rather than a real provider. */
export function SimulatedBadge() {
  return (
    <span className="inline-block rounded-full border border-border-strong bg-primary-soft px-2.5 py-0.5 text-primary-hover">
      Simulated
    </span>
  );
}
