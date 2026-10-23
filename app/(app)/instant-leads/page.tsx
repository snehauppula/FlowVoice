import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { TableWrap, Tag, Td, Th, fmtDate } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Instant Leads" };

export default async function InstantLeadsPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: queue } = await supabase.from("leads")
    .select("id, name, phone, source, status, consent_given, created_at")
    .eq("organization_id", org.organizationId).in("status", ["new", "queued"])
    .order("created_at", { ascending: false }).limit(50);

  return (
    <>
      <PageHeader title="Instant Leads" description="New leads waiting for a first call." />
      <p className="mb-4 rounded-md border border-border-strong bg-accent-soft p-3">
        Leads arrive through the API (<code>POST /api/v1/leads</code>, see <Link className="underline" href="/developers">Developers</Link>) or are added manually. Duplicate phone numbers are rejected. Automatic calling the moment a lead arrives needs a telephony provider and isn&apos;t available yet; you can place a simulated call from each row.
      </p>
      {!queue?.length ? (
        <EmptyState title="The queue is empty" description="New and queued leads appear here." action={<Link href="/leads" className="underline">Add a lead</Link>} />
      ) : (
        <TableWrap>
          <thead><tr><Th>Lead</Th><Th>Phone</Th><Th>Source</Th><Th>Consent</Th><Th>Status</Th><Th>Received</Th><Th /></tr></thead>
          <tbody>{queue.map((l) => (
            <tr key={l.id}>
              <Td><Link className="underline" href={`/leads/${l.id}`}>{l.name ?? "Unnamed"}</Link></Td>
              <Td>{l.phone}</Td><Td>{l.source}</Td>
              <Td>{l.consent_given ? <Tag tone="good">recorded</Tag> : <Tag>not recorded</Tag>}</Td>
              <Td><Tag>{l.status}</Tag></Td><Td>{fmtDate(l.created_at)}</Td>
              <Td><Link className="underline" href={`/talk?to=${encodeURIComponent(l.phone)}`}>Simulated call</Link></Td>
            </tr>
          ))}</tbody>
        </TableWrap>
      )}
    </>
  );
}
