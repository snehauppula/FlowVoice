"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "./button";
import type { FormResult } from "./simple-form";

/** Runs a server action on click, with optional window.confirm for destructive operations. */
export function ActionButton({
  action, label, busyLabel = "Working…", confirm, variant = "outline", success,
}: {
  action: () => Promise<FormResult>;
  label: string;
  busyLabel?: string;
  confirm?: string;
  variant?: "outline" | "primary" | "ghost" | "accent";
  success?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      disabled={busy}
      onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        setBusy(true);
        const r = await action();
        setBusy(false);
        if (!r.ok) return void toast.error(r.error);
        toast.success(success ?? r.message ?? "Done.");
        router.refresh();
      }}
    >
      {busy ? busyLabel : label}
    </Button>
  );
}
