import type { Metadata } from "next";
import Link from "next/link";
import { CreateCampaignForm } from "@/components/campaigns/campaign-forms";
import { Card, EmptyState, PageHeader } from "@/components/ui/page";
import { TableWrap, Tag, Td, Th, fmtDate } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bulk Campaigns" };

export default async function CampaignsPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const [camps, emps] = await Promise.all([
    supabase.from("campaigns").select("id, name, status, created_at, employees(name)").eq("organization_id", org.organizationId).order("created_at", { ascending: false }).limit(50),
    supabase.from("employees").select("id, name").eq("organization_id", org.organizationId).neq("status", "archived").order("name"),
  ]);
  const ids = (camps.data ?? []).map((c) => c.id);
  const { data: contacts } = ids.length
    ? await supabase.from("campaign_contacts").select("campaign_id, status").in("campaign_id", ids).limit(20000)
    : { data: [] as { campaign_id: string; status: string }[] };
  const stat = (id: string) => {
    const rows = (contacts ?? []).filter((c) => c.campaign_id === id);
    return { total: rows.length, done: rows.filter((r) => r.status === "completed").length, failed: rows.filter((r) => r.status === "failed").length };
  };

  return (
    <>
      <PageHeader title="Bulk Campaigns" description="Upload contacts, assign an employee and run outbound campaigns." />
      <p className="mb-4 rounded-md border border-border-strong bg-accent-soft p-3">
        Automatic background dialing needs a telephony provider and a job worker, neither of which is connected. Until then, a running campaign is processed with <strong>simulated</strong> calls in small batches that you trigger manually.
      </p>
      {emps.data?.length ? (
        <Card className="mb-6 p-4 sm:p-6"><h2 className="mb-3 text-base">New campaign</h2><CreateCampaignForm employees={emps.data} /></Card>
      ) : (
        <div className="mb-6"><EmptyState title="Create an employee first" description="Campaigns need an employee to make the calls." action={<Link href="/employees/new" className="underline">New employee</Link>} /></div>
      )}
      {!camps.data?.length ? (
        <EmptyState title="No campaigns yet" description="Create one above, then import a CSV of contacts." />
      ) : (
        <TableWrap>
          <thead><tr><Th>Campaign</Th><Th>Employee</Th><Th>Status</Th><Th>Progress</Th><Th>Created</Th><Th /></tr></thead>
          <tbody>{camps.data.map((c) => {
            const s = stat(c.id);
            const emp = c.employees as unknown as { name: string } | null;
            return (
              <tr key={c.id}>
                <Td>{c.name}</Td><Td>{emp?.name ?? "—"}</Td>
                <Td><Tag tone={c.status === "running" ? "good" : c.status === "cancelled" ? "bad" : "muted"}>{c.status}</Tag></Td>
                <Td>{s.total ? `${s.done}/${s.total} answered${s.failed ? ` · ${s.failed} failed` : ""}` : "No contacts"}</Td>
                <Td>{fmtDate(c.created_at)}</Td>
                <Td><Link className="underline" href={`/campaigns/${c.id}`}>Open</Link></Td>
              </tr>
            );
          })}</tbody>
        </TableWrap>
      )}
    </>
  );
}
