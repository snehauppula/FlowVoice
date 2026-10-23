import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmployeeWizard } from "@/components/employees/employee-wizard";
import { StatusBadge } from "@/components/employees/status-badge";
import { StatusControls } from "@/components/employees/status-controls";
import { Card, PageHeader } from "@/components/ui/page";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { emptyEmployee, type EmployeeFormValues } from "@/lib/validations/employee";

export const metadata: Metadata = { title: "Employee" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DONE = ["completed"];
const FAILED = ["failed", "busy", "no_answer", "provider_error"];

export default async function EmployeePage({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const org = await requireOrg();
  const supabase = await createClient();
  const [{ data: e }, { data: calls }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).eq("organization_id", org.organizationId).maybeSingle(),
    supabase.from("calls").select("status").eq("employee_id", id).eq("organization_id", org.organizationId),
  ]);
  if (!e) notFound();

  const initial: EmployeeFormValues = {
    ...emptyEmployee,
    name: e.name,
    purpose: e.purpose ?? "",
    objective: e.objective ?? "",
    calling_mode: e.calling_mode,
    voice: e.voice ?? emptyEmployee.voice,
    language: e.language,
    greeting: e.greeting ?? "",
    system_prompt: e.system_prompt ?? "",
    qualification_questions: e.qualification_questions ?? [],
    capture_fields: e.capture_fields ?? [],
    allowed_actions: e.allowed_actions ?? [],
  };

  const rows = calls ?? [];
  const stats = [
    ["Calls", rows.length],
    ["Completed", rows.filter((c) => DONE.includes(c.status)).length],
    ["Failed", rows.filter((c) => FAILED.includes(c.status)).length],
  ] as const;

  return (
    <>
      <PageHeader
        title={e.name}
        description={e.published_version ? `Published version ${e.published_version}` : "Not published yet"}
        actions={<div className="flex flex-wrap items-center gap-3"><StatusBadge status={e.status} /><StatusControls id={e.id} status={e.status} /></div>}
      />
      <div className="mb-6 grid grid-cols-3 gap-3">
        {stats.map(([label, n]) => (
          <Card key={label}>
            <p className="text-muted">{label}</p>
            <p className="text-[24px] font-semibold leading-8">{n}</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 text-base">Configuration</h2>
      <EmployeeWizard employeeId={e.id} initial={initial} />
    </>
  );
}
