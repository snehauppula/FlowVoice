import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Circle, PhoneCall, Plus } from "lucide-react";
import { CallActivityChart, type DayBucket } from "@/components/dashboard/call-activity-chart";
import { StatusBadge } from "@/components/employees/status-badge";
import { Card, EmptyState, PageHeader, SectionTitle, SimulatedBadge } from "@/components/ui/page";
import { Tag, callTone, fmtDate, fmtDuration } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { daysAgoIso, lastDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const RANGES = [7, 30, 90] as const;
const FAILED = ["failed", "busy", "no_answer", "provider_error"];
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const requested = Number(Array.isArray(sp.days) ? sp.days[0] : sp.days);
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 30;

  const org = await requireOrg();
  const supabase = await createClient();
  const since = daysAgoIso(days);
  const orgId = org.organizationId;
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

  const [total, completedN, failedN, rows, recent, employees, leadsN, qualifiedN, runningN, credits, allEmployeesN] = await Promise.all([
    count(supabase.from("calls").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", since)),
    count(supabase.from("calls").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", since).eq("status", "completed")),
    count(supabase.from("calls").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", since).in("status", FAILED)),
    supabase.from("calls").select("created_at, status, duration_seconds, cost_credits").eq("organization_id", orgId).gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
    supabase.from("calls").select("id, status, to_number, direction, is_simulated, duration_seconds, created_at, employees(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("employees").select("id, name, status, calling_mode").eq("organization_id", orgId).neq("status", "archived").order("updated_at", { ascending: false }).limit(5),
    count(supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", since)),
    count(supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", since).in("status", ["qualified", "booked"])),
    count(supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "running")),
    supabase.from("credit_transactions").select("amount").eq("organization_id", orgId),
    count(supabase.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", orgId).neq("status", "archived")),
  ]);

  const callRows = rows.data ?? [];
  const done = callRows.filter((c) => c.status === "completed");
  const avgSeconds = done.length ? Math.round(done.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / done.length) : null;
  const balance = (credits.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const activeEmployees = (employees.data ?? []).filter((e) => e.status === "active").length;
  const answerRate = total ? Math.round((completedN / total) * 100) : null;

  // Daily buckets over the selected range (Asia/Kolkata days), zero-filled so gaps read as zero calls.
  const buckets = new Map<string, DayBucket>();
  for (const d of lastDays(days)) buckets.set(d.key, { day: d.key, label: d.label, completed: 0, other: 0 });
  for (const c of callRows) {
    const b = buckets.get(dayKey(new Date(c.created_at)));
    if (!b) continue;
    if (c.status === "completed") b.completed++;
    else if (FAILED.includes(c.status)) b.other++;
  }
  const chartData = [...buckets.values()];
  const sampled = total > callRows.length;
  const summary = `Daily calls for the last ${days} days: ${completedN} completed and ${failedN} not answered or failed out of ${total}.`;

  const checklist = [
    { label: "Create an AI employee", done: allEmployeesN > 0, href: "/employees/new" },
    { label: "Publish it so it can take calls", done: (employees.data ?? []).some((e) => e.status === "active"), href: "/employees" },
    { label: "Place a simulated test call", done: total > 0, href: "/talk" },
    { label: "Add or import your first leads", done: leadsN > 0, href: "/leads" },
  ];
  const onboarding = checklist.some((c) => !c.done) && total === 0;

  const kpis: { label: string; value: string; hint?: string }[] = [
    { label: "Completed", value: String(completedN), hint: answerRate == null ? undefined : `${answerRate}% of calls` },
    { label: "Not answered / failed", value: String(failedN) },
    { label: "Avg. call length", value: avgSeconds == null ? "—" : fmtDuration(avgSeconds), hint: done.length ? "completed calls" : "no completed calls" },
    { label: "Leads", value: String(leadsN), hint: leadsN ? `${qualifiedN} qualified` : undefined },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${org.organizationName} · last ${days} days. Figures come from your database.`}
        actions={
          <>
            <nav aria-label="Date range" className="flex gap-1">
              {RANGES.map((r) => (
                <Link key={r} href={`/dashboard?days=${r}`} aria-current={r === days ? "true" : undefined} className={cn("chip", r === days && "chip-active")}>{r}d</Link>
              ))}
            </nav>
            <Link href="/talk" className="btn-secondary"><PhoneCall size={16} /> Test call</Link>
            <Link href="/employees/new" className="btn-primary"><Plus size={16} /> New employee</Link>
          </>
        }
      />

      {onboarding && (
        <Card className="mb-6 border-primary/20 bg-primary-pale p-5">
          <h2 className="text-base">Get started with FlowVoice</h2>
          <p className="mt-0.5 text-muted">Four steps from empty workspace to your first simulated conversation.</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-primary/40">
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", c.done ? "bg-primary-strong text-primary-foreground" : "border border-border-strong text-muted")}>
                    {c.done ? <Check size={14} aria-label="Done" /> : <Circle size={8} aria-label="To do" />}
                  </span>
                  <span className={cn(c.done && "text-muted line-through")}>{c.label}</span>
                  {!c.done && <ArrowRight size={16} className="ml-auto text-primary-strong" aria-hidden />}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col justify-between bg-gradient-to-br from-primary-pale to-surface p-5 lg:row-span-1">
          <p className="text-muted">Total calls</p>
          <p className="mt-2 text-[24px] font-semibold leading-8">{total}</p>
          <p className="mt-1 text-muted">{total ? `${activeEmployees} active employee${activeEmployees === 1 ? "" : "s"}${runningN ? ` · ${runningN} campaign${runningN === 1 ? "" : "s"} running` : ""}` : "No calls in this period"}</p>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="p-4">
              <p className="text-muted">{k.label}</p>
              <p className="mt-1 text-[24px] font-semibold leading-8">{k.value}</p>
              {k.hint && <p className="text-muted">{k.hint}</p>}
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle aside={<span className="text-muted">Calls per day</span>}>Call activity</SectionTitle>
          {total === 0 ? (
            <EmptyState title="No calls in this period" description="Place a simulated test call and your daily activity will chart here." action={<Link href="/talk" className="btn-primary">Place a test call</Link>} />
          ) : (
            <>
              <CallActivityChart data={chartData} summary={summary} />
              {sampled && <p className="mt-2 text-muted">Chart reflects the most recent {callRows.length} calls.</p>}
            </>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle aside={<Link href="/employees" className="text-primary-hover hover:underline">View all</Link>}>AI employees</SectionTitle>
          {!employees.data?.length ? (
            <p className="text-muted">No employees yet. <Link href="/employees/new" className="font-semibold text-primary-hover underline">Create one</Link>.</p>
          ) : (
            <ul className="divide-y divide-border">
              {employees.data.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2.5">
                  <Link href={`/employees/${e.id}`} className="min-w-0 truncate font-semibold hover:text-primary-hover">{e.name}</Link>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-border pt-3 text-muted">
            Credit balance: <strong className="text-foreground">{balance.toFixed(2)}</strong>{" "}
            <Link href="/billing" className="text-primary-hover underline">Billing</Link>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionTitle aside={<Link href="/conversations" className="text-primary-hover hover:underline">All conversations</Link>}>Recent calls</SectionTitle>
        {!recent.data?.length ? (
          <p className="text-muted">Calls will appear here as they happen.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.data.map((c) => {
              const emp = c.employees as unknown as { name: string } | null;
              return (
                <li key={c.id}>
                  <Link href={`/conversations/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 hover:bg-primary-pale">
                    <span className="min-w-0 flex-1 truncate font-semibold">{emp?.name ?? "Employee"} <span className="font-normal text-muted">→ {c.to_number}</span></span>
                    <span className="flex items-center gap-1.5"><Tag tone={callTone(c.status)}>{c.status.replace("_", " ")}</Tag>{c.is_simulated && <SimulatedBadge />}</span>
                    <span className="w-16 text-muted">{fmtDuration(c.duration_seconds)}</span>
                    <span className="text-muted">{fmtDate(c.created_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
