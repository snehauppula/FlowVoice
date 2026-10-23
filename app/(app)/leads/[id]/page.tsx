import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/page";
import { TableWrap, Tag, Td, Th, callTone, fmtDate, fmtDuration } from "@/components/ui/data";
import { LeadStatusControl } from "@/components/leads/lead-status-control";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lead" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: lead }, { data: calls }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).eq("organization_id", org.organizationId).maybeSingle(),
    supabase.from("calls").select("id, status, created_at, duration_seconds, is_simulated").eq("lead_id", id).eq("organization_id", org.organizationId).order("created_at", { ascending: false }),
  ]);
  if (!lead) notFound();

  const facts: [string, string][] = [
    ["Phone", lead.phone], ["Email", lead.email ?? "—"], ["Source", lead.source],
    ["Consent to call", lead.consent_given ? "Yes" : "Not recorded"],
    ["Added", fmtDate(lead.created_at)], ["Opted out", lead.opted_out_at ? fmtDate(lead.opted_out_at) : "No"],
  ];

  return (
    <>
      <PageHeader title={lead.name ?? "Unnamed lead"} description={lead.phone}
        actions={<Link href={`/talk?to=${encodeURIComponent(lead.phone)}`} className="btn-secondary">Simulated test call</Link>} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 self-start">
          <Card>
            <dl className="space-y-2">{facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="break-words text-right">{v}</dd></div>
            ))}</dl>
          </Card>
          <Card><LeadStatusControl id={lead.id} status={lead.status} /></Card>
        </div>
        <div>
          <h2 className="mb-2 text-base">Call attempts</h2>
          {calls?.length ? (
            <TableWrap>
              <thead><tr><Th>When</Th><Th>Status</Th><Th>Duration</Th><Th /></tr></thead>
              <tbody>{calls.map((c) => (
                <tr key={c.id}><Td>{fmtDate(c.created_at)}</Td>
                  <Td><Tag tone={callTone(c.status)}>{c.status.replace("_", " ")}</Tag></Td>
                  <Td>{fmtDuration(c.duration_seconds)}</Td>
                  <Td><Link href={`/conversations/${c.id}`} className="underline">View</Link></Td></tr>
              ))}</tbody>
            </TableWrap>
          ) : <p className="text-muted">No calls to this lead yet.</p>}
        </div>
      </div>
    </>
  );
}
