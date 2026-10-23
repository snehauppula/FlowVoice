"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { setLeadStatus } from "@/app/(app)/leads/actions";
import { LEAD_STATUSES } from "@/lib/validations/lead";

export function LeadStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <Field label="Status" htmlFor="lead-status">
        <Select id="lead-status" value={value} onChange={(e) => setValue(e.target.value)}>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </Select>
      </Field>
      <Button disabled={busy || value === status} onClick={async () => {
        setBusy(true);
        const r = await setLeadStatus(id, value);
        setBusy(false);
        if (!r.ok) return void toast.error(r.error);
        toast.success(r.message ?? "Lead updated.");
        router.refresh();
      }}>{busy ? "Saving…" : "Update status"}</Button>
    </div>
  );
}
