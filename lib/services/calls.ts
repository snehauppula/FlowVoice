import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { voiceProvider } from "@/lib/providers/voice/simulated";
import type { CallResult, CallScenario } from "@/lib/providers/voice/types";

export type RunCallInput = {
  supabase: SupabaseClient;
  organizationId: string;
  employeeId: string;
  to: string;
  scenario: CallScenario;
  idempotencyKey: string;
  leadId?: string | null;
  campaignId?: string | null;
  campaignContactId?: string | null;
};

export type RunCallOutput =
  | { ok: true; callId: string; status: CallResult["status"]; result: CallResult; replay: false }
  | { ok: true; callId: string; replay: true }
  | { ok: false; error: string };

export async function getBalance(supabase: SupabaseClient, organizationId: string): Promise<number> {
  const { data } = await supabase.from("credit_transactions").select("amount").eq("organization_id", organizationId);
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}

/** Creates a call row, runs the simulated provider, and records the outcome through the audited DB function. */
export async function runSimulatedCall(input: RunCallInput): Promise<RunCallOutput> {
  const { supabase, organizationId, employeeId } = input;

  const { data: emp } = await supabase
    .from("employees")
    .select("name, greeting, objective, status, qualification_questions, capture_fields")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!emp) return { ok: false, error: "Employee not found." };
  if (emp.status === "archived") return { ok: false, error: "This employee is archived." };

  if ((await getBalance(supabase, organizationId)) < 1) {
    return { ok: false, error: "Not enough credits. Add simulated credits on the Billing page." };
  }

  const { data: call, error } = await supabase
    .from("calls")
    .insert({
      organization_id: organizationId,
      employee_id: employeeId,
      lead_id: input.leadId ?? null,
      campaign_id: input.campaignId ?? null,
      campaign_contact_id: input.campaignContactId ?? null,
      direction: "outbound",
      status: "initiating",
      to_number: input.to,
      is_simulated: true,
      provider: voiceProvider.id,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !call) {
    if (error?.code === "23505") {
      // Same idempotency key already used: return the existing call instead of dialing twice.
      const { data: existing } = await supabase
        .from("calls").select("id").eq("organization_id", organizationId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
      if (existing) return { ok: true, callId: existing.id, replay: true };
    }
    return { ok: false, error: "Could not start the call. Please try again." };
  }

  const result = await voiceProvider.placeCall({
    employee: {
      name: emp.name,
      greeting: emp.greeting,
      objective: emp.objective,
      qualification_questions: (emp.qualification_questions as string[]) ?? [],
      capture_fields: (emp.capture_fields as { label: string; required: boolean }[]) ?? [],
    },
    to: input.to,
    scenario: input.scenario,
  });

  const { error: completeErr } = await supabase.rpc("complete_simulated_call", {
    p_call: call.id,
    p_status: result.status,
    p_duration: result.durationSeconds,
    p_transcript: result.transcript,
    p_summary: result.summary,
    p_outcome: result.outcome,
    p_captured: result.captured,
    p_error: result.error,
  });
  if (completeErr) return { ok: false, error: "The call ran but its result could not be saved." };

  return { ok: true, callId: call.id, status: result.status, result, replay: false };
}
