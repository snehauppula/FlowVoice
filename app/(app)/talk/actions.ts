"use server";

import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { runSimulatedCall } from "@/lib/services/calls";
import { E164 } from "@/lib/validations/common";
import type { CallResult, CallScenario } from "@/lib/providers/voice/types";

const SCENARIOS: CallScenario[] = ["qualified", "not_interested", "no_answer", "busy", "provider_error"];

export type TalkResult =
  | { ok: true; callId: string; status: string; result: CallResult | null }
  | { ok: false; error: string };

export async function startTestCall(input: {
  employeeId: string;
  to: string;
  scenario: string;
  idempotencyKey: string;
}): Promise<TalkResult> {
  const org = await requireOrg();
  if (org.role === "viewer") return { ok: false, error: "You don't have permission to place test calls." };
  if (!E164.test(input.to)) return { ok: false, error: "Enter the number in international format, e.g. +919876543210." };
  if (!SCENARIOS.includes(input.scenario as CallScenario)) return { ok: false, error: "Unknown scenario." };
  if (!/^[0-9a-f-]{36}$/i.test(input.employeeId) || !/^[\w-]{8,64}$/.test(input.idempotencyKey)) {
    return { ok: false, error: "Invalid request." };
  }

  const supabase = await createClient();
  const out = await runSimulatedCall({
    supabase,
    organizationId: org.organizationId,
    employeeId: input.employeeId,
    to: input.to,
    scenario: input.scenario as CallScenario,
    idempotencyKey: input.idempotencyKey,
  });
  if (!out.ok) return out;
  if (out.replay) return { ok: true, callId: out.callId, status: "completed", result: null };
  return { ok: true, callId: out.callId, status: out.status, result: out.result };
}
