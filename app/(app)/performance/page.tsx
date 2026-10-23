import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui/page";
import { TableWrap, Td, Th } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso } from "@/lib/dates";
import { firstParam } from "@/lib/validations/common";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Performance" };
const RANGES = [7, 30, 90];
const FAILED = ["failed", "busy", "no_answer", "provider_error"];

type Row = { status: string; duration_seconds: number | null; cost_credits: number | string; employee_id: string | null; campaign_id: string | null };

/** All rates are computed from the same rows with the same definitions (see the footnote on the page). */
function metrics(rows: Row[], qualifiedLeads: number) {
  const attempted = rows.length;
  const answered = rows.filter((r) => r.status === "completed").length;
  const failed = rows.filter((r) => FAILED.includes(r.status)).length;
  const seconds = rows.filter((r) => r.status === "completed").reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
  return {
    attempted, answered, failed,
    answerRate: attempted ? answered / attempted : null,
    avgDuration: answered ? Math.round(seconds / answered) : null,
    credits: rows.reduce((s, r) => s + Number(r.cost_credits), 0),
    qualifiedLeads,
    conversion: answered ? qualifiedLeads / answered : null,
  };
}
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);

export default async function PerformancePage({ searchParams }: PageProps<"/performance">) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(firstParam(sp.days))) ? Number(firstParam(sp.days)) : 30;
  const employeeId = /^[0-9a-f-]{36}$/i.test(firstParam(sp.employee)) ? firstParam(sp.employee) : "";

  const org = await requireOrg();
  const supabase = await createClient();
  const since = daysAgoIso(days);
  let callsQ = supabase.from("calls").select("status, duration_seconds, cost_credits, employee_id, campaign_id")
    .eq("organization_id", org.organizationId).gte("created_at", since);
  if (employeeId) callsQ = callsQ.eq("employee_id", employeeId);
  const [calls, employees, campaigns, qualified] = await Promise.all([
    callsQ,
    supabase.from("employees").select("id, name").eq("organization_id", org.organizationId).order("name"),
    supabase.from("campaigns").select("id, name").eq("organization_id", org.organizationId),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", org.organizationId)
      .in("status", ["qualified", "booked"]).gte("created_at", since),
  ]);

  const rows = (calls.data ?? []) as Row[];
  const m = metrics(rows, qualified.count ?? 0);
  const cards: [string, string][] = [
    ["Calls attempted", String(m.attempted)], ["Answered / completed", String(m.answered)], ["Failed", String(m.failed)],
    ["Answer rate", pct(m.answerRate)], ["Avg. duration", m.avgDuration == null ? "—" : `${Math.floor(m.avgDuration / 60)}m ${m.avgDuration % 60}s`],
    ["Qualified leads", String(m.qualifiedLeads)], ["Conversion rate", pct(m.conversion)], ["Credits used", m.credits.toFixed(2)],
    ["Credits per answered call", m.answered ? (m.credits / m.answered).toFixed(2) : "—"],
  ];

  const byEmployee = (employees.data ?? []).map((e) => ({ name: e.name, ...metrics(rows.filter((r) => r.employee_id === e.id), 0) })).filter((r) => r.attempted);
  const byCampaign = (campaigns.data ?? []).map((c) => ({ name: c.name, ...metrics(rows.filter((r) => r.campaign_id === c.id), 0) })).filter((r) => r.attempted);
  const href = (d: number, e = employeeId) => `/performance?days=${d}${e ? `&employee=${e}` : ""}`;

  return (
    <>
      <PageHeader title="Performance" description={`Last ${days} days${employeeId ? ", one employee" : ""}.`}
        actions={<nav aria-label="Date range" className="flex gap-1 rounded-md border border-border-strong p-1">{RANGES.map((r) => (
          <Link key={r} href={href(r)} aria-current={r === days ? "true" : undefined} className={cn("chip", r === days && "chip-active")}>{r}d</Link>
        ))}</nav>} />
      <form action="/performance" className="mb-4 flex items-center gap-2">
        <input type="hidden" name="days" value={days} />
        <label htmlFor="emp" className="text-muted">Employee</label>
        <select id="emp" name="employee" defaultValue={employeeId} className="h-10 rounded-md border border-border-strong bg-surface px-3">
          <option value="">All employees</option>
          {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn-secondary">Apply</button>
      </form>
      {m.attempted === 0 ? (
        <EmptyState title="No calls in this period" description="Metrics appear once calls have been placed. Simulated calls are included." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {cards.map(([l, v]) => <Card key={l}><p className="text-muted">{l}</p><p className="text-[24px] font-semibold leading-8">{v}</p></Card>)}
          </div>
          {[["By employee", byEmployee], ["By campaign", byCampaign]].map(([title, list]) => {
            const items = list as typeof byEmployee;
            return items.length ? (
              <section key={String(title)} className="mt-8">
                <h2 className="mb-2 text-base">{String(title)}</h2>
                <TableWrap>
                  <thead><tr><Th>Name</Th><Th>Attempted</Th><Th>Answered</Th><Th>Answer rate</Th><Th>Credits</Th></tr></thead>
                  <tbody>{items.map((r) => <tr key={r.name}><Td>{r.name}</Td><Td>{r.attempted}</Td><Td>{r.answered}</Td><Td>{pct(r.answerRate)}</Td><Td>{r.credits.toFixed(2)}</Td></tr>)}</tbody>
                </TableWrap>
              </section>
            ) : null;
          })}
          <p className="mt-6 text-muted">
            Definitions: answer rate = completed ÷ attempted. Conversion = qualified or booked leads ÷ completed calls. Qualified leads are leads created in the period. Credits include simulated usage.
          </p>
        </>
      )}
    </>
  );
}
