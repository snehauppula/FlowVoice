"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { setEmployeeStatus } from "@/app/(app)/employees/actions";

const TRANSITIONS: Record<string, { to: string; label: string }[]> = {
  draft: [{ to: "archived", label: "Archive" }],
  active: [{ to: "paused", label: "Pause" }, { to: "archived", label: "Archive" }],
  paused: [{ to: "active", label: "Resume" }, { to: "archived", label: "Archive" }],
  archived: [{ to: "paused", label: "Restore" }],
};

export function StatusControls({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(to: string, label: string) {
    setBusy(true);
    const r = await setEmployeeStatus(id, to);
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success(`${label} done.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(TRANSITIONS[status] ?? []).map((t) => (
        <Button key={t.to} variant="outline" disabled={busy} onClick={() => change(t.to, t.label)}>
          {t.label}
        </Button>
      ))}
    </div>
  );
}
