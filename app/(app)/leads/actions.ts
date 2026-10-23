"use server";

import { revalidatePath } from "next/cache";
import * as Yup from "yup";
import { requireOrg, type OrgContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { phoneSchema } from "@/lib/validations/common";
import type { FormResult } from "@/components/ui/simple-form";

import { LEAD_STATUSES } from "@/lib/validations/lead";

const leadSchema = Yup.object({
  name: Yup.string().trim().max(120).default(""),
  phone: phoneSchema,
  email: Yup.string().trim().email("Enter a valid email").max(200).default(""),
  consent_given: Yup.boolean().default(false),
});

const canWrite = (o: OrgContext) => o.role !== "viewer";

export async function addLead(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await requireOrg();
  if (!canWrite(org)) return { ok: false, error: "You don't have permission to add leads." };
  let v;
  try { v = await leadSchema.validate(raw, { stripUnknown: true }); } catch (e) { return { ok: false, error: (e as Yup.ValidationError).message }; }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    organization_id: org.organizationId,
    name: v.name || null,
    phone: v.phone,
    email: v.email || null,
    source: "manual",
    consent_given: v.consent_given,
  });
  if (error?.code === "23505") return { ok: false, error: "A lead with this phone number already exists." };
  if (error) return { ok: false, error: "Could not add the lead. Please try again." };
  revalidatePath("/leads");
  return { ok: true, message: "Lead added." };
}

export async function setLeadStatus(id: string, status: string): Promise<FormResult> {
  const org = await requireOrg();
  if (!canWrite(org)) return { ok: false, error: "You don't have permission to change leads." };
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status." };
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "do_not_call") patch.opted_out_at = new Date().toISOString();
  const { error } = await supabase.from("leads").update(patch).eq("id", id).eq("organization_id", org.organizationId);
  if (error) return { ok: false, error: "Could not update the lead." };
  revalidatePath("/leads");
  return { ok: true, message: "Lead updated." };
}
