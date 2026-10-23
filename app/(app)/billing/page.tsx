import type { Metadata } from "next";
import { TopupForm } from "@/components/billing/topup-form";
import { Card, EmptyState, PageHeader, SimulatedBadge } from "@/components/ui/page";
import { Pagination, TableWrap, Tag, Td, Th, fmtDate } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, pageParam } from "@/lib/validations/common";

export const metadata: Metadata = { title: "Billing" };
const LOW_BALANCE = 10;

export default async function BillingPage({ searchParams }: PageProps<"/billing">) {
  const page = pageParam((await searchParams).page);
  const org = await requireOrg();
  const supabase = await createClient();
  const [all, ledger] = await Promise.all([
    supabase.from("credit_transactions").select("type, amount").eq("organization_id", org.organizationId),
    supabase.from("credit_transactions").select("id, type, amount, description, is_simulated, created_at", { count: "exact" })
      .eq("organization_id", org.organizationId).order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);

  const rows = all.data ?? [];
  const sum = (types: string[]) => rows.filter((r) => types.includes(r.type)).reduce((s, r) => s + Number(r.amount), 0);
  const balance = rows.reduce((s, r) => s + Number(r.amount), 0);
  const added = sum(["topup", "bonus", "refund", "adjustment"]);
  const used = -sum(["usage"]);

  return (
    <>
      <PageHeader title="Billing" description="Credits, usage and transactions." actions={<SimulatedBadge />} />
      <p className="mb-4 rounded-md border border-border-strong bg-accent-soft p-3">
        Billing is simulated during development. No payment gateway is connected, no money is charged, and no invoices are issued.
      </p>
      {balance < LOW_BALANCE && (
        <p role="alert" className="mb-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-danger">
          Low balance: {balance.toFixed(2)} credits left. Calls stop when credits run out.
        </p>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[["Balance", balance], ["Credits added", added], ["Credits used", used]].map(([l, v]) => (
          <Card key={String(l)}><p className="text-muted">{l}</p><p className="text-[24px] font-semibold leading-8">{Number(v).toFixed(2)}</p></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="self-start p-4 sm:p-6"><h2 className="mb-3 text-base">Add credits</h2><TopupForm /></Card>
        <div>
          <h2 className="mb-2 text-base">Transaction history</h2>
          {!ledger.data?.length ? (
            <EmptyState title="No transactions" description="Credits you add and calls you make will be listed here." />
          ) : (
            <>
              <TableWrap>
                <thead><tr><Th>When</Th><Th>Type</Th><Th>Description</Th><Th className="text-right">Amount</Th></tr></thead>
                <tbody>{ledger.data.map((t) => (
                  <tr key={t.id}><Td>{fmtDate(t.created_at)}</Td>
                    <Td><Tag tone={Number(t.amount) < 0 ? "muted" : "good"}>{t.type}</Tag></Td>
                    <Td>{t.description}{t.is_simulated && " (simulated)"}</Td>
                    <Td className="text-right tabular-nums">{Number(t.amount).toFixed(2)}</Td></tr>
                ))}</tbody>
              </TableWrap>
              <Pagination page={page} total={ledger.count ?? 0} pageSize={PAGE_SIZE} hrefFor={(p) => `/billing?page=${p}`} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
