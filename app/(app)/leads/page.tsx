import type { Metadata } from "next";
import Link from "next/link";
import { AddLeadForm } from "@/components/leads/add-lead-form";
import { Card, EmptyState, PageHeader } from "@/components/ui/page";
import { Pagination, TableWrap, Tag, Td, Th, fmtDate } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, firstParam, likeTerm, pageParam } from "@/lib/validations/common";
import { LEAD_STATUSES } from "@/lib/validations/lead";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads & Results" };

const SORTS = { newest: ["created_at", false], oldest: ["created_at", true], name: ["name", true] } as const;

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const sp = await searchParams;
  const q = firstParam(sp.q).trim().slice(0, 80);
  const status = (LEAD_STATUSES as readonly string[]).includes(firstParam(sp.status)) ? firstParam(sp.status) : "";
  const sortKey = (firstParam(sp.sort) in SORTS ? firstParam(sp.sort) : "newest") as keyof typeof SORTS;
  const page = pageParam(sp.page);

  const org = await requireOrg();
  const supabase = await createClient();
  const [col, asc] = SORTS[sortKey];
  let query = supabase
    .from("leads")
    .select("id, name, phone, email, source, status, created_at, callback_at", { count: "exact" })
    .eq("organization_id", org.organizationId)
    .order(col, { ascending: asc })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${likeTerm(q)}%,phone.ilike.%${likeTerm(q)}%,email.ilike.%${likeTerm(q)}%`);
  const { data, count, error } = await query;

  const qs = (over: Record<string, string>) =>
    `/leads?${new URLSearchParams(Object.entries({ q, status, sort: sortKey, ...over }).filter(([k, v]) => v && !(k === "sort" && v === "newest")) as [string, string][])}`;
  const exportHref = `/leads/export?${new URLSearchParams(Object.entries({ q, status }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <>
      <PageHeader title="Leads & Results" description="Every lead, its latest outcome and callbacks."
        actions={<a href={exportHref} className="btn-secondary">Export CSV</a>} />
      <Card className="mb-6 p-4 sm:p-6">
        <h2 className="mb-3 text-base">Add a lead</h2>
        <AddLeadForm />
      </Card>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form action="/leads" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} aria-label="Search leads" placeholder="Search name, phone or email" className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 sm:w-72" />
          <button className="btn-secondary">Search</button>
        </form>
        <div className="flex flex-wrap items-center gap-1">
          {[["", "All"], ...LEAD_STATUSES.map((s) => [s, s.replace("_", " ")])].map(([v, l]) => (
            <Link key={v} href={qs({ status: v, page: "" })} aria-current={v === status ? "true" : undefined}
              className={cn("chip", v === status && "chip-active")}>{l}</Link>
          ))}
        </div>
      </div>
      <p className="mb-2 text-muted">Sort:{" "}
        {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((k) => (
          <Link key={k} href={qs({ sort: k, page: "" })} className={cn("mr-2 underline", k === sortKey && "font-semibold")}>{k}</Link>
        ))}
      </p>
      {error ? (
        <EmptyState title="Couldn't load leads" description="Refresh to try again." />
      ) : !data?.length ? (
        <EmptyState title={q || status ? "No matching leads" : "No leads yet"} description={q || status ? "Try a different search or filter." : "Add a lead above, import contacts in a campaign, or send leads through the API."} />
      ) : (
        <>
          <TableWrap>
            <thead><tr><Th>Name</Th><Th>Phone</Th><Th>Source</Th><Th>Status</Th><Th>Added</Th><Th /></tr></thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id}>
                  <Td>{l.name ?? "—"}</Td><Td>{l.phone}</Td><Td>{l.source}</Td>
                  <Td><Tag tone={l.status === "qualified" || l.status === "booked" ? "good" : l.status === "do_not_call" ? "bad" : "muted"}>{l.status.replace("_", " ")}</Tag></Td>
                  <Td>{fmtDate(l.created_at)}</Td>
                  <Td><Link className="underline" href={`/leads/${l.id}`}>Open</Link></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pagination page={page} total={count ?? 0} pageSize={PAGE_SIZE} hrefFor={(p) => qs({ page: String(p) })} />
        </>
      )}
    </>
  );
}
