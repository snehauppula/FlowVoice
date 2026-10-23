"use server";

import { revalidatePath } from "next/cache";
import * as Yup from "yup";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { runSimulatedCall } from "@/lib/services/calls";
import { E164 } from "@/lib/validations/common";
import type { CallScenario } from "@/lib/providers/voice/types";
import type { FormResult } from "@/components/ui/simple-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROWS = 5000;
const BATCH_SIZE = 10;

const createSchema = Yup.object({
  name: Yup.string().trim().min(2).max(120).required(),
  employee_id: Yup.string().matches(UUID).required(),
  timezone: Yup.string().required(),
  window_start: Yup.string().matches(/^\d{2}:\d{2}/).required(),
  window_end: Yup.string().matches(/^\d{2}:\d{2}/).required(),
  max_concurrency: Yup.number().integer().min(1).max(50).required(),
  max_retries: Yup.number().integer().min(0).max(10).required(),
  retry_delay_minutes: Yup.number().integer().min(5).max(1440).required(),
});

const writer = (role: string) => role !== "viewer";

export async function createCampaign(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await requireOrg();
  if (!writer(org.role)) return { ok: false, error: "You don't have permission to create campaigns." };
  let v;
  try { v = await createSchema.validate(raw, { stripUnknown: true }); } catch (e) { return { ok: false, error: (e as Yup.ValidationError).message }; }
  if (v.window_start >= v.window_end) return { ok: false, error: "The calling window must start before it ends." };
  try { new Intl.DateTimeFormat("en", { timeZone: v.timezone }); } catch { return { ok: false, error: "Unknown timezone." }; }

  const supabase = await createClient();
  const { data: emp } = await supabase.from("employees").select("id").eq("id", v.employee_id).eq("organization_id", org.organizationId).maybeSingle();
  if (!emp) return { ok: false, error: "Employee not found." };
  const { data, error } = await supabase.from("campaigns").insert({ ...v, organization_id: org.organizationId }).select("id").single();
  if (error || !data) return { ok: false, error: "Could not create the campaign." };
  revalidatePath("/campaigns");
  return { ok: true, message: "Campaign created.", data: { id: data.id } };
}

export async function importContacts(
  campaignId: string,
  rows: { phone: string; name: string }[],
  consentConfirmed: boolean,
): Promise<FormResult> {
  const org = await requireOrg();
  if (!writer(org.role)) return { ok: false, error: "You don't have permission to import contacts." };
  if (!consentConfirmed) return { ok: false, error: "Confirm that these contacts may lawfully be called." };
  if (!UUID.test(campaignId) || !Array.isArray(rows)) return { ok: false, error: "Invalid request." };
  if (rows.length > MAX_ROWS) return { ok: false, error: `Import at most ${MAX_ROWS} contacts at a time.` };

  const supabase = await createClient();
  const { data: camp } = await supabase.from("campaigns").select("id, status").eq("id", campaignId).eq("organization_id", org.organizationId).maybeSingle();
  if (!camp) return { ok: false, error: "Campaign not found." };
  if (["completed", "cancelled"].includes(camp.status)) return { ok: false, error: "This campaign is closed." };

  const seen = new Set<string>();
  const valid = rows.flatMap((r) => {
    const phone = String(r.phone ?? "").trim();
    if (!E164.test(phone) || seen.has(phone)) return [];
    seen.add(phone);
    return [{ organization_id: org.organizationId, campaign_id: campaignId, phone, name: String(r.name ?? "").trim().slice(0, 120) || null }];
  });
  if (!valid.length) return { ok: false, error: "No valid phone numbers found. Use international format like +919876543210." };

  // Honour opt-outs: skip numbers already marked do-not-call on leads.
  const { data: dnc } = await supabase.from("leads").select("phone").eq("organization_id", org.organizationId).eq("status", "do_not_call").in("phone", valid.map((v) => v.phone).slice(0, 1000));
  const blocked = new Set((dnc ?? []).map((d) => d.phone));
  const toInsert = valid.filter((v) => !blocked.has(v.phone));

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { data, error } = await supabase.from("campaign_contacts").upsert(chunk, { onConflict: "campaign_id,phone", ignoreDuplicates: true }).select("id");
    if (error) return { ok: false, error: "Import failed part-way. Re-importing is safe: duplicates are skipped." };
    inserted += data?.length ?? 0;
  }
  revalidatePath(`/campaigns/${campaignId}`);
  const skipped = rows.length - inserted;
  return { ok: true, message: `Imported ${inserted} contact(s). Skipped ${skipped} (invalid, duplicate or opted out).` };
}

const TRANSITIONS: Record<string, string[]> = {
  draft: ["running", "cancelled"],
  running: ["paused", "cancelled"],
  paused: ["running", "cancelled"],
  scheduled: ["running", "cancelled"],
};

export async function setCampaignStatus(campaignId: string, next: string): Promise<FormResult> {
  const org = await requireOrg();
  if (!writer(org.role)) return { ok: false, error: "You don't have permission to change campaigns." };
  if (!UUID.test(campaignId)) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { data: c } = await supabase.from("campaigns").select("status").eq("id", campaignId).eq("organization_id", org.organizationId).maybeSingle();
  if (!c) return { ok: false, error: "Campaign not found." };
  if (!TRANSITIONS[c.status]?.includes(next)) return { ok: false, error: `A ${c.status} campaign can't become ${next}.` };
  if (next === "running") {
    const { count } = await supabase.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");
    if (!count) return { ok: false, error: "Import contacts before starting." };
  }
  const { error } = await supabase.from("campaigns").update({ status: next }).eq("id", campaignId).eq("organization_id", org.organizationId);
  if (error) return { ok: false, error: "Could not update the campaign." };
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: `Campaign ${next}.` };
}

function inWindow(tz: string, start: string, end: string): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return parts >= start.slice(0, 5) && parts < end.slice(0, 5);
}

function pickScenario(): CallScenario {
  const r = Math.random();
  return r < 0.6 ? "qualified" : r < 0.8 ? "no_answer" : r < 0.9 ? "busy" : "not_interested";
}

/** Simulated stand-in for the background worker: processes one bounded batch per click. */
export async function runSimulatedBatch(campaignId: string): Promise<FormResult> {
  const org = await requireOrg();
  if (!writer(org.role)) return { ok: false, error: "You don't have permission to run campaigns." };
  if (!UUID.test(campaignId)) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();

  const { data: c } = await supabase.from("campaigns").select("*").eq("id", campaignId).eq("organization_id", org.organizationId).maybeSingle();
  if (!c) return { ok: false, error: "Campaign not found." };
  if (c.status !== "running") return { ok: false, error: "Start the campaign first." };
  if (!c.employee_id) return { ok: false, error: "This campaign has no employee assigned." };
  if (!inWindow(c.timezone, c.window_start, c.window_end)) {
    return { ok: false, error: `Outside the calling window (${String(c.window_start).slice(0, 5)}–${String(c.window_end).slice(0, 5)} ${c.timezone}).` };
  }

  const nowIso = new Date().toISOString();
  const { data: contacts } = await supabase.from("campaign_contacts").select("id, phone, attempts")
    .eq("campaign_id", campaignId).eq("status", "pending").or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
    .order("created_at").limit(Math.min(BATCH_SIZE, c.max_concurrency * 5));
  if (!contacts?.length) {
    return { ok: false, error: "No contacts are ready to call right now (retries may be waiting for their delay)." };
  }

  let done = 0, failed = 0;
  for (const contact of contacts) {
    const attempt = contact.attempts + 1;
    await supabase.from("campaign_contacts").update({ status: "calling" }).eq("id", contact.id);
    const out = await runSimulatedCall({
      supabase, organizationId: org.organizationId, employeeId: c.employee_id, to: contact.phone,
      scenario: pickScenario(), idempotencyKey: `${contact.id}:${attempt}`,
      campaignId, campaignContactId: contact.id,
    });
    if (!out.ok) {
      await supabase.from("campaign_contacts").update({ status: "pending" }).eq("id", contact.id);
      revalidatePath(`/campaigns/${campaignId}`);
      return { ok: false, error: `${out.error} Processed ${done + failed} contact(s) before stopping.` };
    }
    if (out.replay || out.status === "completed") {
      await supabase.from("campaign_contacts").update({ status: "completed", attempts: attempt }).eq("id", contact.id);
      done++;
    } else if (attempt > c.max_retries) {
      await supabase.from("campaign_contacts").update({ status: "failed", attempts: attempt }).eq("id", contact.id);
      failed++;
    } else {
      const next = new Date(Date.now() + c.retry_delay_minutes * 60_000).toISOString();
      await supabase.from("campaign_contacts").update({ status: "pending", attempts: attempt, next_attempt_at: next }).eq("id", contact.id);
      failed++;
    }
  }

  const { count: remaining } = await supabase.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", ["pending", "calling"]);
  if (!remaining) await supabase.from("campaigns").update({ status: "completed" }).eq("id", campaignId).eq("organization_id", org.organizationId);

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true, message: `Simulated batch finished: ${done} answered, ${failed} not answered.${remaining ? "" : " Campaign completed."}` };
}
