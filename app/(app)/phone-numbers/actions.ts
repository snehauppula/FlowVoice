"use server";

import { revalidatePath } from "next/cache";
import * as Yup from "yup";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { phoneSchema } from "@/lib/validations/common";
import type { FormResult } from "@/components/ui/simple-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const writer = (role: string) => role !== "viewer";

export async function addPhoneNumber(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await requireOrg();
  if (!writer(org.role)) return { ok: false, error: "You don't have permission to add numbers." };
  let e164: string;
  try { e164 = await phoneSchema.validate(raw.e164); } catch (e) { return { ok: false, error: (e as Yup.ValidationError).message }; }
  const label = String(raw.label ?? "").trim().slice(0, 60) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("phone_numbers").insert({ organization_id: org.organizationId, e164, label, provider: "manual", status: "available", capabilities: { voice: false } });
  if (error?.code === "23505") return { ok: false, error: "This number is already in your inventory." };
  if (error) return { ok: false, error: "Could not add the number." };
  revalidatePath("/phone-numbers");
  return { ok: true, message: "Number saved to your inventory (not verified with a provider)." };
}

export async function assignNumber(numberId: string, employeeId: string): Promise<FormResult> {
  const org = await requireOrg();
  if (!writer(org.role)) return { ok: false, error: "You don't have permission to assign numbers." };
  if (!UUID.test(numberId) || (employeeId && !UUID.test(employeeId))) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();

  const { data: num } = await supabase.from("phone_numbers").select("id").eq("id", numberId).eq("organization_id", org.organizationId).maybeSingle();
  if (!num) return { ok: false, error: "Number not found." };
  if (employeeId) {
    const { data: emp } = await supabase.from("employees").select("id").eq("id", employeeId).eq("organization_id", org.organizationId).maybeSingle();
    if (!emp) return { ok: false, error: "Employee not found." };
  }

  await supabase.from("employees").update({ phone_number_id: null }).eq("organization_id", org.organizationId).eq("phone_number_id", numberId);
  const { error } = await supabase.from("phone_numbers")
    .update({ inbound_employee_id: employeeId || null, status: employeeId ? "assigned" : "available" })
    .eq("id", numberId).eq("organization_id", org.organizationId);
  if (error) return { ok: false, error: "Could not update the assignment." };
  if (employeeId) await supabase.from("employees").update({ phone_number_id: numberId }).eq("id", employeeId).eq("organization_id", org.organizationId);
  revalidatePath("/phone-numbers");
  revalidatePath("/inbound");
  return { ok: true, message: employeeId ? "Number assigned." : "Number unassigned." };
}

export async function deletePhoneNumber(numberId: string): Promise<FormResult> {
  const org = await requireOrg();
  if (!["owner", "admin"].includes(org.role)) return { ok: false, error: "Only owners and admins can remove numbers." };
  if (!UUID.test(numberId)) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.from("phone_numbers").delete().eq("id", numberId).eq("organization_id", org.organizationId);
  if (error) return { ok: false, error: "Could not remove the number." };
  revalidatePath("/phone-numbers");
  return { ok: true, message: "Number removed." };
}
