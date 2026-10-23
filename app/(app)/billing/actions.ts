"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormResult } from "@/components/ui/simple-form";

export async function simulateTopup(raw: Record<string, unknown>): Promise<FormResult> {
  const org = await requireOrg();
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) return { ok: false, error: "Enter an amount between 1 and 100,000." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("simulate_topup", { p_org: org.organizationId, p_amount: amount });
  if (error) return { ok: false, error: error.message.includes("forbidden") ? "Only owners and admins can add credits." : "Could not add credits." };
  revalidatePath("/billing");
  return { ok: true, message: `Added ${amount} simulated credits. No payment was taken.` };
}
