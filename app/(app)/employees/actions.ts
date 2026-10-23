"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYEE_STATUSES, employeeSchema, type EmployeeFormValues } from "@/lib/validations/employee";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

const WRITERS = ["owner", "admin", "member"];

async function validate(values: unknown) {
  return employeeSchema.validate(values, { abortEarly: false, stripUnknown: true });
}

export async function saveEmployee(
  id: string | null,
  raw: EmployeeFormValues,
  publish: boolean,
): Promise<ActionResult> {
  const org = await requireOrg();
  if (!WRITERS.includes(org.role)) return { ok: false, error: "You don't have permission to edit employees." };

  let values: EmployeeFormValues;
  try {
    values = await validate(raw);
  } catch {
    return { ok: false, error: "Some fields are invalid. Please review the form." };
  }

  const supabase = await createClient();
  const row = { ...values, organization_id: org.organizationId };
  let employeeId = id;

  if (id) {
    const { error } = await supabase.from("employees").update(values).eq("id", id).eq("organization_id", org.organizationId);
    if (error) return { ok: false, error: "Could not save changes. Please try again." };
  } else {
    const { data, error } = await supabase
      .from("employees")
      .insert({ ...row, created_by: org.userId })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Could not create the employee. Please try again." };
    employeeId = data.id;
  }

  if (publish && employeeId) {
    const published = await publishVersion(employeeId, org.organizationId, org.userId, values);
    if (!published.ok) return published;
  }

  revalidatePath("/employees");
  return { ok: true, id: employeeId as string };
}

async function publishVersion(
  employeeId: string,
  organizationId: string,
  userId: string,
  snapshot: EmployeeFormValues,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("employee_versions")
    .select("version")
    .eq("employee_id", employeeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;

  const { error: vErr } = await supabase.from("employee_versions").insert({
    organization_id: organizationId,
    employee_id: employeeId,
    version,
    snapshot,
    published: true,
    created_by: userId,
  });
  if (vErr) return { ok: false, error: "Saved, but publishing failed. Please try publishing again." };

  const { error } = await supabase
    .from("employees")
    .update({ status: "active", published_version: version })
    .eq("id", employeeId)
    .eq("organization_id", organizationId);
  if (error) return { ok: false, error: "Saved, but publishing failed. Please try publishing again." };
  return { ok: true, id: employeeId };
}

export async function setEmployeeStatus(id: string, status: string): Promise<ActionResult> {
  const org = await requireOrg();
  if (!WRITERS.includes(org.role)) return { ok: false, error: "You don't have permission to change this employee." };
  if (!(EMPLOYEE_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status." };

  const supabase = await createClient();
  if (status === "active") {
    const { data } = await supabase.from("employees").select("published_version").eq("id", id).eq("organization_id", org.organizationId).single();
    if (!data?.published_version) return { ok: false, error: "Publish this employee before activating it." };
  }
  const { error } = await supabase.from("employees").update({ status }).eq("id", id).eq("organization_id", org.organizationId);
  if (error) return { ok: false, error: "Could not update the status. Please try again." };
  revalidatePath("/employees");
  return { ok: true, id };
}
