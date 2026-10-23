import type { Metadata } from "next";
import Link from "next/link";
import { KnowledgeForm } from "@/components/train/knowledge-form";
import { ActionButton } from "@/components/ui/confirm-button";
import { Card, EmptyState, PageHeader } from "@/components/ui/page";
import { TableWrap, Tag, Td, Th, fmtDate } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/validations/common";
import { deleteKnowledge } from "./actions";

export const metadata: Metadata = { title: "Train Employees" };

export default async function TrainPage({ searchParams }: PageProps<"/train">) {
  const sp = await searchParams;
  const org = await requireOrg();
  const supabase = await createClient();
  const { data: employees } = await supabase.from("employees").select("id, name, published_version").eq("organization_id", org.organizationId).neq("status", "archived").order("name");

  if (!employees?.length) {
    return (
      <>
        <PageHeader title="Train Employees" description="Knowledge and instructions for each employee." />
        <EmptyState title="No employees yet" description="Create an employee, then add knowledge to it here." action={<Link href="/employees/new" className="underline">New employee</Link>} />
      </>
    );
  }

  const wanted = firstParam(sp.employee);
  const current = employees.find((e) => e.id === wanted) ?? employees[0];
  const [{ data: sources }, { data: versions }] = await Promise.all([
    supabase.from("knowledge_sources").select("id, kind, title, status, error, created_at").eq("employee_id", current.id).eq("organization_id", org.organizationId).order("created_at", { ascending: false }),
    supabase.from("employee_versions").select("id, version, created_at, published").eq("employee_id", current.id).eq("organization_id", org.organizationId).order("version", { ascending: false }).limit(20),
  ]);

  return (
    <>
      <PageHeader title="Train Employees" description="Knowledge sources, instructions and version history." />
      <form action="/train" className="mb-4 flex items-center gap-2">
        <label htmlFor="employee" className="text-muted">Employee</label>
        <select id="employee" name="employee" defaultValue={current.id} className="h-10 rounded-md border border-border-strong bg-surface px-3">
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn-secondary">Switch</button>
        <Link href={`/employees/${current.id}`} className="ml-auto underline">Edit instructions &amp; publish</Link>
      </form>
      <p className="mb-4 rounded-md border border-border-strong bg-accent-soft p-3">
        Entries are stored but <strong>not indexed</strong>: document processing, website crawling and PDF upload aren&apos;t available yet, so employees don&apos;t use this knowledge on calls. Entries stay “pending” until processing exists.
      </p>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="self-start p-4 sm:p-6"><h2 className="mb-3 text-base">Add knowledge</h2><KnowledgeForm key={current.id} employeeId={current.id} /></Card>
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-base">Sources</h2>
            {!sources?.length ? <p className="text-muted">No knowledge added for {current.name} yet.</p> : (
              <TableWrap>
                <thead><tr><Th>Title</Th><Th>Type</Th><Th>Status</Th><Th>Added</Th><Th /></tr></thead>
                <tbody>{sources.map((s) => (
                  <tr key={s.id}><Td>{s.title}</Td><Td className="uppercase">{s.kind}</Td>
                    <Td><Tag tone={s.status === "ready" ? "good" : s.status === "failed" ? "bad" : "muted"}>{s.status}</Tag>{s.error && <p className="text-danger">{s.error}</p>}</Td>
                    <Td>{fmtDate(s.created_at)}</Td>
                    <Td><ActionButton label="Delete" busyLabel="Deleting…" confirm="Delete this entry?" action={deleteKnowledge.bind(null, s.id)} /></Td></tr>
                ))}</tbody>
              </TableWrap>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-base">Version history</h2>
            {!versions?.length ? <p className="text-muted">Not published yet. Publishing an employee creates version 1.</p> : (
              <ul className="space-y-1">{versions.map((v) => (
                <li key={v.id} className="flex justify-between rounded-md border border-border bg-surface px-3 py-2">
                  <span>Version {v.version}{v.version === current.published_version && " (live)"}</span><span className="text-muted">{fmtDate(v.created_at)}</span>
                </li>
              ))}</ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
