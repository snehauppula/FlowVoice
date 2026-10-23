import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-border-strong bg-surface px-3 text-sm placeholder:text-muted/70 transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-ring/40 focus-visible:outline-offset-0";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "h-10", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {hint ? <p className="text-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
