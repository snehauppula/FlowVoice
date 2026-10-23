"use client";

import { useMemo, useState } from "react";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { ActionButton } from "@/components/ui/confirm-button";
import { SimpleForm } from "@/components/ui/simple-form";
import { createCampaign, importContacts, runSimulatedBatch, setCampaignStatus } from "@/app/(app)/campaigns/actions";
import { E164 } from "@/lib/validations/common";

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];

export function CreateCampaignForm({ employees }: { employees: { id: string; name: string }[] }) {
  const router = useRouter();
  return (
    <SimpleForm
      columns={2} submitLabel="Create campaign" busyLabel="Creating…" resetOnSuccess
      initial={{ name: "", employee_id: employees[0]?.id ?? "", timezone: "Asia/Kolkata", window_start: "10:00", window_end: "19:00", max_concurrency: 3, max_retries: 2, retry_delay_minutes: 60 }}
      schema={Yup.object({
        name: Yup.string().trim().min(2, "At least 2 characters").required("Name the campaign"),
        employee_id: Yup.string().required("Choose an employee"),
        max_concurrency: Yup.number().typeError("Enter a number").integer().min(1).max(50).required(),
        max_retries: Yup.number().typeError("Enter a number").integer().min(0).max(10).required(),
        retry_delay_minutes: Yup.number().typeError("Enter a number").integer().min(5, "At least 5 minutes").max(1440).required(),
      })}
      onSubmit={createCampaign}
      onSuccess={(d) => router.push(`/campaigns/${(d as { id: string }).id}`)}
      fields={[
        { name: "name", label: "Campaign name" },
        { name: "employee_id", label: "Employee", type: "select", options: employees.map((e) => ({ value: e.id, label: e.name })) },
        { name: "timezone", label: "Timezone", type: "select", options: TIMEZONES.map((t) => ({ value: t, label: t })) },
        { name: "window_start", label: "Calling window start", type: "time" },
        { name: "window_end", label: "Calling window end", type: "time" },
        { name: "max_concurrency", label: "Max concurrent calls", type: "number" },
        { name: "max_retries", label: "Retries per contact", type: "number" },
        { name: "retry_delay_minutes", label: "Retry delay (minutes)", type: "number" },
      ]}
    />
  );
}

/** Minimal RFC-4180-style CSV parser (quotes, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((c) => c.trim())) rows.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export function CsvImport({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [table, setTable] = useState<string[][] | null>(null);
  const [phoneCol, setPhoneCol] = useState(0);
  const [nameCol, setNameCol] = useState(-1);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const headers = table?.[0] ?? [];
  const mapped = useMemo(() => (table ? table.slice(1).map((r) => ({ phone: (r[phoneCol] ?? "").trim(), name: nameCol >= 0 ? (r[nameCol] ?? "").trim() : "" })) : []), [table, phoneCol, nameCol]);
  const validCount = useMemo(() => new Set(mapped.filter((m) => E164.test(m.phone)).map((m) => m.phone)).size, [mapped]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2_000_000) return void toast.error("File is too large (max 2 MB).");
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) return void toast.error("The file needs a header row and at least one contact.");
    setTable(parsed);
    const guess = parsed[0].findIndex((h) => /phone|mobile|number/i.test(h));
    setPhoneCol(guess >= 0 ? guess : 0);
    const ng = parsed[0].findIndex((h) => /name/i.test(h));
    setNameCol(ng);
  }

  return (
    <div className="space-y-4">
      <Field label="CSV file" htmlFor="csv" hint="First row must be headers. Phone numbers must be in international format.">
        <input id="csv" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
      </Field>
      {table && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone column" htmlFor="phoneCol">
              <Select id="phoneCol" value={phoneCol} onChange={(e) => setPhoneCol(Number(e.target.value))}>
                {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </Select>
            </Field>
            <Field label="Name column (optional)" htmlFor="nameCol">
              <Select id="nameCol" value={nameCol} onChange={(e) => setNameCol(Number(e.target.value))}>
                <option value={-1}>None</option>
                {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
              </Select>
            </Field>
          </div>
          <p>{validCount} valid unique number(s) of {mapped.length} rows.</p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[320px] text-left">
              <thead><tr><th className="px-3 py-1 text-muted">Name</th><th className="px-3 py-1 text-muted">Phone</th><th className="px-3 py-1 text-muted">Valid</th></tr></thead>
              <tbody>{mapped.slice(0, 5).map((m, i) => (
                <tr key={i}><td className="px-3 py-1">{m.name || "—"}</td><td className="px-3 py-1">{m.phone}</td><td className="px-3 py-1">{E164.test(m.phone) ? "Yes" : "No"}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I confirm these contacts have agreed to be called and are not on a Do-Not-Disturb or do-not-call registry. Numbers marked do-not-call in FlowVoice are skipped automatically.</span>
          </label>
          <Button disabled={busy || !validCount || !consent} onClick={async () => {
            setBusy(true);
            const r = await importContacts(campaignId, mapped, consent);
            setBusy(false);
            if (!r.ok) return void toast.error(r.error);
            toast.success(r.message ?? "Imported.");
            setTable(null); setConsent(false);
            router.refresh();
          }}>{busy ? "Importing…" : `Import ${validCount} contact(s)`}</Button>
        </>
      )}
    </div>
  );
}

export function CampaignControls({ id, status }: { id: string; status: string }) {
  const btn = (label: string, to: string, variant: "primary" | "outline" = "outline", confirm?: string) => (
    <ActionButton key={to} label={label} variant={variant} confirm={confirm} action={setCampaignStatus.bind(null, id, to)} />
  );
  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && btn("Start", "running", "primary")}
      {status === "running" && btn("Pause", "paused")}
      {status === "paused" && btn("Resume", "running", "primary")}
      {["draft", "running", "paused"].includes(status) && btn("Cancel", "cancelled", "outline", "Cancel this campaign? It can't be restarted.")}
      {status === "running" && <ActionButton label="Run simulated batch" busyLabel="Calling…" variant="accent" action={runSimulatedBatch.bind(null, id)} />}
    </div>
  );
}
