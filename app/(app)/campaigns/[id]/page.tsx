import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignControls, CsvImport } from "@/components/campaigns/campaign-forms";
import { Card, PageHeader } from "@/components/ui/page";
import { Pagination, TableWrap, Tag, Td, Th } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, pageParam } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Campaign" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CampaignPage({ params, searchParams }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const page = pageParam((await searchParams).page);
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: c } = await supabase.from("campaigns").select("*, employees(name)").eq("id", id).eq("organization_id", org.organizationId).maybeSingle();
  if (!c) notFound();

  const counts = await Promise.all(
    ["pending", "calling", "completed", "failed", "opted_out", "skipped"].map(async (s) => {
      const { count } = await supabase.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", id).eq("status", s);
      return [s, count ?? 0] as const;
    }),
  );
  const { data: contacts, count: total } = await supabase.from("campaign_contacts").select("id, phone, name, status, attempts", { count: "exact" })
    .eq("campaign_id", id).order("created_at").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const emp = c.employees as unknown as { name: string } | null;
  const closed = ["completed", "cancelled"].includes(c.status);

  return (
    <>
      <PageHeader title={c.name} description={`${emp?.name ?? "No employee"} · ${String(c.window_start).slice(0, 5)}–${String(c.window_end).slice(0, 5)} ${c.timezone} · up to ${c.max_concurrency} at once · ${c.max_retries} retries`}
        actions={<div className="flex flex-wrap items-center gap-3"><Tag tone={c.status === "running" ? "good" : "muted"}>{c.status}</Tag><CampaignControls id={c.id} status={c.status} /></div>} />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map(([s, n]) => <Card key={s}><p className="capitalize text-muted">{s.replace("_", " ")}</p><p className="text-[24px] font-semibold leading-8">{n}</p></Card>)}
      </div>
      {!closed && <Card className="mb-6 p-4 sm:p-6"><h2 className="mb-3 text-base">Import contacts</h2><CsvImport campaignId={c.id} /></Card>}
      <h2 className="mb-2 text-base">Contacts</h2>
      {!contacts?.length ? <p className="text-muted">No contacts imported yet.</p> : (
        <>
          <TableWrap>
            <thead><tr><Th>Name</Th><Th>Phone</Th><Th>Status</Th><Th>Attempts</Th></tr></thead>
            <tbody>{contacts.map((x) => <tr key={x.id}><Td>{x.name ?? "—"}</Td><Td>{x.phone}</Td><Td><Tag tone={x.status === "completed" ? "good" : x.status === "failed" ? "bad" : "muted"}>{x.status.replace("_", " ")}</Tag></Td><Td>{x.attempts}</Td></tr>)}</tbody>
          </TableWrap>
          <Pagination page={page} total={total ?? 0} pageSize={PAGE_SIZE} hrefFor={(p) => `/campaigns/${id}?page=${p}`} />
        </>
      )}
    </>
  );
}
