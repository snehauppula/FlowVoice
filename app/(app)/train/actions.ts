"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormResult } from "@/components/ui/simple-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function addKnowledge(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await requireOrg();
  if (org.role === "viewer") return { ok: false, error: "You don't have permission to edit knowledge." };
  const employeeId = String(raw.employee_id ?? "");
  const kind = String(raw.kind ?? "");
  const title = String(raw.title ?? "").trim();
  const content = String(raw.content ?? "").trim();
  if (!UUID.test(employeeId)) return { ok: false, error: "Choose an employee." };
  if (!["faq", "text", "website"].includes(kind)) return { ok: false, error: "Unknown source type." };
  if (title.length < 2 || title.length > 120) return { ok: false, error: "Give the entry a title (2–120 characters)." };
  if (kind !== "website" && (content.length < 5 || content.length > 20000)) return { ok: false, error: "Add content (5–20,000 characters)." };

  let sourceUrl: string | null = null;
  if (kind === "website") {
    try {
      const u = new URL(content);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
      sourceUrl = u.toString();
    } catch { return { ok: false, error: "Enter a valid http(s) URL." }; }
  }

  const supabase = await createClient();
  const { data: emp } = await supabase.from("employees").select("id").eq("id", employeeId).eq("organization_id", org.organizationId).maybeSingle();
  if (!emp) return { ok: false, error: "Employee not found." };
  const { error } = await supabase.from("knowledge_sources").insert({
    organization_id: org.organizationId, employee_id: employeeId, kind, title,
    content: kind === "website" ? null : content, source_url: sourceUrl, status: "pending",
  });
  if (error) return { ok: false, error: "Could not save the entry." };
  revalidatePath("/train");
  return { ok: true, message: "Saved. It is not indexed yet: processing isn't available." };
}

export async function deleteKnowledge(id: string): Promise<FormResult> {
  const org = await requireOrg();
  if (!["owner", "admin", "member"].includes(org.role)) return { ok: false, error: "You don't have permission to delete entries." };
  if (!UUID.test(id)) return { ok: false, error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_sources").delete().eq("id", id).eq("organization_id", org.organizationId);
  if (error) return { ok: false, error: "Could not delete the entry." };
  revalidatePath("/train");
  return { ok: true, message: "Entry deleted." };
}
