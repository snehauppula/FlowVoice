import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { TableWrap, Tag, Td, Th, callTone, fmtDate, fmtDuration } from "@/components/ui/data";
import { AssignSelect } from "@/components/phone-numbers/number-controls";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inbound Calls" };

export default async function InboundPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const [nums, emps, calls] = await Promise.all([
    supabase.from("phone_numbers").select("id, e164, label, inbound_employee_id").eq("organization_id", org.organizationId),
    supabase.from("employees").select("id, name, calling_mode").eq("organization_id", org.organizationId).neq("status", "archived").order("name"),
    supabase.from("calls").select("id, status, from_number, duration_seconds, created_at").eq("organization_id", org.organizationId).eq("direction", "inbound").order("created_at", { ascending: false }).limit(20),
  ]);
  const inboundEmps = (emps.data ?? []).filter((e) => e.calling_mode !== "outbound");

  return (
    <>
      <PageHeader title="Inbound Calls" description="Route incoming calls to an employee and review what came in." />
      <p className="mb-4 rounded-md border border-border-strong bg-accent-soft p-3">
        Receiving real calls needs a connected telephony provider and a number that points at FlowVoice. Until then you can prepare routing here; no incoming calls will arrive.
      </p>
      <h2 className="mb-2 text-base">Routing</h2>
      {!nums.data?.length ? (
        <EmptyState title="No numbers to route" description="Add a number first." action={<Link href="/phone-numbers" className="underline">Go to Phone Numbers</Link>} />
      ) : !inboundEmps.length ? (
        <EmptyState title="No inbound-capable employees" description="Set an employee's calling mode to Inbound or Both, then route a number to it." action={<Link href="/employees" className="underline">My Employees</Link>} />
      ) : (
        <TableWrap>
          <thead><tr><Th>Number</Th><Th>Routes to</Th></tr></thead>
          <tbody>{nums.data.map((n) => (
            <tr key={n.id}><Td>{n.e164}{n.label ? ` · ${n.label}` : ""}</Td>
              <Td><AssignSelect numberId={n.id} employeeId={n.inbound_employee_id ?? ""} employees={inboundEmps} /></Td></tr>
          ))}</tbody>
        </TableWrap>
      )}
      <h2 className="mb-2 mt-8 text-base">Recent inbound calls</h2>
      {!calls.data?.length ? (
        <p className="text-muted">No inbound calls yet.</p>
      ) : (
        <TableWrap>
          <thead><tr><Th>When</Th><Th>From</Th><Th>Status</Th><Th>Duration</Th><Th /></tr></thead>
          <tbody>{calls.data.map((c) => (
            <tr key={c.id}><Td>{fmtDate(c.created_at)}</Td><Td>{c.from_number}</Td><Td><Tag tone={callTone(c.status)}>{c.status.replace("_", " ")}</Tag></Td><Td>{fmtDuration(c.duration_seconds)}</Td><Td><Link className="underline" href={`/conversations/${c.id}`}>View</Link></Td></tr>
          ))}</tbody>
        </TableWrap>
      )}
    </>
  );
}
