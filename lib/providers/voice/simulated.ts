import type { CallRequest, CallResult, TranscriptTurn, VoiceProvider } from "./types";

const ANSWERS = [
  "Yes, that works for me.",
  "I'm mostly looking at options right now.",
  "Around next month, I think.",
  "Can you send me more details?",
  "That sounds reasonable.",
];

/** Scripted stand-in for a real voice stack. Nothing here touches a phone network. */
export class SimulatedVoiceProvider implements VoiceProvider {
  readonly id = "simulated";
  readonly simulated = true;

  async placeCall({ employee, scenario }: CallRequest): Promise<CallResult> {
    const empty = { transcript: [], summary: null, outcome: null, captured: {}, durationSeconds: 0 };
    if (scenario === "no_answer") return { ...empty, status: "no_answer", error: "No one picked up (simulated)." };
    if (scenario === "busy") return { ...empty, status: "busy", error: "Line busy (simulated)." };
    if (scenario === "provider_error") return { ...empty, status: "provider_error", error: "Simulated provider failure." };

    const transcript: TranscriptTurn[] = [];
    let t = 1500;
    const say = (speaker: TranscriptTurn["speaker"], text: string) => {
      transcript.push({ speaker, text, at_ms: t });
      t += 2500 + text.length * 45;
    };

    say("employee", employee.greeting?.trim() || `Hello, this is ${employee.name}.`);
    say("caller", "Hi, yes, speaking.");

    if (scenario === "not_interested") {
      say("employee", employee.objective ? `I'm calling about this: ${employee.objective}. Is now a good time?` : "Is now a good time to talk?");
      say("caller", "Sorry, I'm not interested.");
      say("employee", "Understood, thank you for your time. Goodbye.");
      return {
        status: "completed",
        durationSeconds: Math.round(t / 1000),
        transcript,
        summary: "The contact declined and the call ended politely.",
        outcome: "not_interested",
        captured: {},
        error: null,
      };
    }

    employee.qualification_questions.forEach((q, i) => {
      say("employee", q);
      say("caller", ANSWERS[i % ANSWERS.length]);
    });
    say("employee", "Thank you, that's everything I needed. Goodbye.");

    const captured: Record<string, string> = {};
    employee.capture_fields.forEach((f) => (captured[f.label] = "(simulated value)"));

    return {
      status: "completed",
      durationSeconds: Math.round(t / 1000),
      transcript,
      summary: `Simulated qualified conversation: the contact answered ${employee.qualification_questions.length} question(s).`,
      outcome: "qualified",
      captured,
      error: null,
    };
  }
}

export const voiceProvider: VoiceProvider = new SimulatedVoiceProvider();
