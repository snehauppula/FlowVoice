import type { Metadata } from "next";
import { AddNumberForm, AssignSelect } from "@/components/phone-numbers/number-controls";
import { ActionButton } from "@/components/ui/confirm-button";
import { Card, EmptyState, PageHeader } from "@/components/ui/page";
import { TableWrap, Tag, Td, Th } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deletePhoneNumber } from "./actions";

export const metadata: Metadata = { title: "Phone Numbers" };

export default async function PhoneNumbersPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const [nums, emps] = await Promise.all([
    supabase.from("phone_numbers").select("id, e164, label, provider, status, inbound_employee_id, last_error").eq("organization_id", org.organizationId).order("created_at", { ascending: false }),
    supabase.from("employees").select("id, name").eq("organization_id", org.organizationId).neq("status", "archived").order("name"),
  ]);
  const canDelete = ["owner", "admin"].includes(org.role);

  return (
    <>
      <PageHeader title="Phone Numbers" description="Your number inventory, routing and caller ID." />
      <p className="mb-4 rounded-md border border-border-strong bg-accent-soft p-3">
        No telephony provider is connected. Numbers you save here are records only: they are not verified, purchased or routed by a carrier, and FlowVoice can&apos;t place or receive real calls on them yet.
      </p>
      <Card className="mb-6 p-4 sm:p-6"><h2 className="mb-3 text-base">Add a number</h2><AddNumberForm /></Card>
      {!nums.data?.length ? (
        <EmptyState title="No numbers yet" description="Add a number you own to plan routing and caller ID." />
      ) : (
        <TableWrap>
          <thead><tr><Th>Number</Th><Th>Label</Th><Th>Provider</Th><Th>Status</Th><Th>Assigned employee</Th><Th /></tr></thead>
          <tbody>{nums.data.map((n) => (
            <tr key={n.id}>
              <Td>{n.e164}</Td><Td>{n.label ?? "—"}</Td>
              <Td>{n.provider === "manual" ? "Manual entry" : n.provider}</Td>
              <Td><Tag tone={n.status === "error" ? "bad" : n.status === "assigned" ? "good" : "muted"}>{n.status}</Tag>{n.last_error && <p className="text-danger">{n.last_error}</p>}</Td>
              <Td><AssignSelect numberId={n.id} employeeId={n.inbound_employee_id ?? ""} employees={emps.data ?? []} /></Td>
              <Td>{canDelete && <ActionButton label="Remove" busyLabel="Removing…" confirm={`Remove ${n.e164}?`} action={deletePhoneNumber.bind(null, n.id)} />}</Td>
            </tr>
          ))}</tbody>
        </TableWrap>
      )}
    </>
  );
}
