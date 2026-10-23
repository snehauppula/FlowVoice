import { AudioLines } from "lucide-react";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl bg-primary-strong text-primary-foreground shadow-card"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <AudioLines size={size * 0.56} strokeWidth={2.2} />
    </span>
  );
}

export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="text-base font-semibold tracking-tight">FlowVoice</span>
    </span>
  );
}
