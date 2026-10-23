export type TranscriptTurn = { speaker: "employee" | "caller"; text: string; at_ms: number };

export type CallScenario = "qualified" | "not_interested" | "no_answer" | "busy" | "provider_error";

export type CallRequest = {
  employee: {
    name: string;
    greeting: string | null;
    objective: string | null;
    qualification_questions: string[];
    capture_fields: { label: string; required: boolean }[];
  };
  to: string;
  scenario: CallScenario;
};

export type CallResult = {
  status: "completed" | "no_answer" | "busy" | "provider_error";
  durationSeconds: number;
  transcript: TranscriptTurn[];
  summary: string | null;
  outcome: string | null;
  captured: Record<string, string>;
  error: string | null;
};

/**
 * Provider adapter boundary. A real telephony/STT/TTS/LLM stack implements this
 * interface; the simulated adapter below is the only implementation today.
 */
export interface VoiceProvider {
  readonly id: string;
  readonly simulated: boolean;
  placeCall(req: CallRequest): Promise<CallResult>;
}
