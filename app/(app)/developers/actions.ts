"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WEBHOOK_EVENTS } from "@/lib/validations/developers";
import type { FormResult } from "@/components/ui/simple-form";

async function adminOrg() {
  const org = await requireOrg();
  return ["owner", "admin"].includes(org.role) ? org : null;
}

export async function createApiKey(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await adminOrg();
  if (!org) return { ok: false, error: "Only owners and admins can manage API keys." };
  const name = String(raw.name ?? "").trim();
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Name the key (2–60 characters)." };

  const secret = `fv_${randomBytes(32).toString("base64url")}`;
  const supabase = await createClient();
  const { error } = await supabase.from("api_keys").insert({
    organization_id: org.organizationId,
    name,
    key_prefix: secret.slice(0, 11),
    key_hash: createHash("sha256").update(secret).digest("hex"),
    created_by: org.userId,
  });
  if (error) return { ok: false, error: "Could not create the key." };
  revalidatePath("/developers");
  // The secret is returned once and is never stored; only its hash is.
  return { ok: true, message: "API key created. Copy it now; it won't be shown again.", data: { secret } };
}

export async function revokeApiKey(id: string): Promise<FormResult> {
  const org = await adminOrg();
  if (!org) return { ok: false, error: "Only owners and admins can manage API keys." };
  const supabase = await createClient();
  const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() })
    .eq("id", id).eq("organization_id", org.organizationId);
  if (error) return { ok: false, error: "Could not revoke the key." };
  revalidatePath("/developers");
  return { ok: true, message: "Key revoked." };
}

function safeHttpsUrl(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(\d{1,3}\.){3}\d{1,3}$/.test(h) || h.includes(":")) return null;
    return u.toString();
  } catch { return null; }
}

export async function createWebhook(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await adminOrg();
  if (!org) return { ok: false, error: "Only owners and admins can manage webhooks." };
  const url = safeHttpsUrl(String(raw.url ?? "").trim());
  if (!url) return { ok: false, error: "Enter a public https:// URL (no localhost or IP addresses)." };
  const events = (Array.isArray(raw.events) ? raw.events : []).filter((e): e is string => (WEBHOOK_EVENTS as readonly string[]).includes(String(e)));
  if (!events.length) return { ok: false, error: "Select at least one event." };

  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  const supabase = await createClient();
  const { error } = await supabase.from("webhook_endpoints").insert({ organization_id: org.organizationId, url, events, secret });
  if (error) return { ok: false, error: "Could not register the webhook." };
  revalidatePath("/developers");
  return { ok: true, message: "Webhook registered. Copy the signing secret now; it won't be shown again.", data: { secret } };
}

export async function deleteWebhook(id: string): Promise<FormResult> {
  const org = await adminOrg();
  if (!org) return { ok: false, error: "Only owners and admins can manage webhooks." };
  const supabase = await createClient();
  const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id).eq("organization_id", org.organizationId);
  if (error) return { ok: false, error: "Could not delete the webhook." };
  revalidatePath("/developers");
  return { ok: true, message: "Webhook deleted." };
}
