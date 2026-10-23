import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, SimulatedBadge } from "@/components/ui/page";
import { Pagination, TableWrap, Tag, Td, Th, callTone, fmtDate, fmtDuration } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, firstParam, likeTerm, pageParam } from "@/lib/validations/common";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "All Conversations" };

const STATUSES = ["completed", "failed", "busy", "no_answer", "provider_error", "cancelled"];

export default async function ConversationsPage({ searchParams }: PageProps<"/conversations">) {
  const sp = await searchParams;
  const q = firstParam(sp.q).trim().slice(0, 80);
  const status = STATUSES.includes(firstParam(sp.status)) ? firstParam(sp.status) : "";
  const direction = ["inbound", "outbound"].includes(firstParam(sp.direction)) ? firstParam(sp.direction) : "";
  const page = pageParam(sp.page);

  const org = await requireOrg();
  const supabase = await createClient();
  let query = supabase
    .from("calls")
    .select("id, direction, status, to_number, from_number, is_simulated, duration_seconds, created_at, employees(name), leads(name)", { count: "exact" })
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (direction) query = query.eq("direction", direction);
  if (q) query = query.or(`to_number.ilike.%${likeTerm(q)}%,from_number.ilike.%${likeTerm(q)}%`);
  const { data, count, error } = await query;

  const qs = (over: Record<string, string>) =>
    `/conversations?${new URLSearchParams(Object.entries({ q, status, direction, ...over }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <>
      <PageHeader title="All Conversations" description="Every call, with transcripts and summaries." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form action="/conversations" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {direction && <input type="hidden" name="direction" value={direction} />}
          <input name="q" defaultValue={q} aria-label="Search by phone number" placeholder="Search phone number" className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 sm:w-64" />
          <button className="btn-secondary">Search</button>
        </form>
        <nav aria-label="Filters" className="flex flex-wrap gap-1">
          {[["", "All"], ...STATUSES.map((s) => [s, s.replace("_", " ")])].map(([v, l]) => (
            <Link key={v} href={qs({ status: v })} aria-current={v === status ? "true" : undefined}
              className={cn("chip", v === status && "chip-active")}>{l}</Link>
          ))}
        </nav>
      </div>

      {error ? (
        <EmptyState title="Couldn't load conversations" description="Refresh to try again." />
      ) : !data?.length ? (
        <EmptyState title={q || status || direction ? "No matching calls" : "No calls yet"} description={q || status || direction ? "Try different filters." : "Place a simulated test call from Talk to an Employee."} action={<Link href="/talk" className="underline">Go to Talk to an Employee</Link>} />
      ) : (
        <>
          <TableWrap>
            <thead><tr><Th>When</Th><Th>Direction</Th><Th>Employee</Th><Th>Contact</Th><Th>Status</Th><Th>Duration</Th><Th /></tr></thead>
            <tbody>
              {data.map((c) => {
                const emp = c.employees as unknown as { name: string } | null;
                const lead = c.leads as unknown as { name: string | null } | null;
                return (
                  <tr key={c.id}>
                    <Td>{fmtDate(c.created_at)}</Td>
                    <Td className="capitalize">{c.direction}</Td>
                    <Td>{emp?.name ?? "—"}</Td>
                    <Td>{lead?.name ? `${lead.name} · ` : ""}{c.direction === "inbound" ? c.from_number : c.to_number}</Td>
                    <Td><span className="flex flex-wrap gap-1"><Tag tone={callTone(c.status)}>{c.status.replace("_", " ")}</Tag>{c.is_simulated && <SimulatedBadge />}</span></Td>
                    <Td>{fmtDuration(c.duration_seconds)}</Td>
                    <Td><Link href={`/conversations/${c.id}`} className="underline">View</Link></Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} hrefFor={(p) => qs({ page: String(p) })} />
        </>
      )}
    </>
  );
}
