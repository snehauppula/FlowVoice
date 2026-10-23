"use server";

import { revalidatePath } from "next/cache";
import * as Yup from "yup";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormResult } from "@/components/ui/simple-form";

const orgSchema = Yup.object({
  name: Yup.string().trim().min(2).max(120).required(),
  timezone: Yup.string().trim().required(),
  calling_hours_start: Yup.string().matches(/^\d{2}:\d{2}/).required(),
  calling_hours_end: Yup.string().matches(/^\d{2}:\d{2}/).required(),
  default_max_retries: Yup.number().integer().min(0).max(10).required(),
  retention_days: Yup.number().integer().min(7).max(3650).required(),
});

function validTimezone(tz: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

export async function updateOrganization(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await requireOrg();
  if (!["owner", "admin"].includes(org.role)) return { ok: false, error: "Only owners and admins can change organization settings." };
  let v;
  try { v = await orgSchema.validate(raw, { stripUnknown: true }); } catch (e) { return { ok: false, error: (e as Yup.ValidationError).message }; }
  if (!validTimezone(v.timezone)) return { ok: false, error: "Unknown timezone." };
  if (v.calling_hours_start >= v.calling_hours_end) return { ok: false, error: "Calling hours must start before they end." };

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update(v).eq("id", org.organizationId);
  if (error) return { ok: false, error: "Could not save settings." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Organization settings saved." };
}

export async function updateProfile(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await requireOrg();
  const name = String(raw.full_name ?? "").trim();
  if (name.length < 2 || name.length > 100) return { ok: false, error: "Enter your full name (2–100 characters)." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", org.userId);
  if (error) return { ok: false, error: "Could not save your profile." };
  revalidatePath("/settings");
  return { ok: true, message: "Profile saved." };
}

export async function setMemberRole(userId: string, role: string): Promise<FormResult> {
  const org = await requireOrg();
  if (!["owner", "admin"].includes(org.role)) return { ok: false, error: "Only owners and admins can change roles." };
  if (!["admin", "member", "viewer"].includes(role)) return { ok: false, error: "Unknown role." };
  if (userId === org.userId) return { ok: false, error: "You can't change your own role." };
  const supabase = await createClient();
  const { data: target } = await supabase.from("organization_members").select("role")
    .eq("organization_id", org.organizationId).eq("user_id", userId).maybeSingle();
  if (!target) return { ok: false, error: "Member not found." };
  if (target.role === "owner") return { ok: false, error: "The owner's role can't be changed." };
  const { error } = await supabase.from("organization_members").update({ role }).eq("organization_id", org.organizationId).eq("user_id", userId);
  if (error) return { ok: false, error: "Could not change the role." };
  revalidatePath("/settings");
  return { ok: true, message: "Role updated." };
}
