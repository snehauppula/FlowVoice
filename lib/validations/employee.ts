import * as Yup from "yup";

export const CALLING_MODES = ["outbound", "inbound", "both"] as const;
export const EMPLOYEE_STATUSES = ["draft", "active", "paused", "archived"] as const;

export const LANGUAGES = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi" },
  { value: "ta-IN", label: "Tamil" },
  { value: "te-IN", label: "Telugu" },
  { value: "bn-IN", label: "Bengali" },
  { value: "mr-IN", label: "Marathi" },
  { value: "en-US", label: "English (US)" },
] as const;

// Labels for the simulated engine. Real voices depend on the speech provider chosen later.
export const VOICES = [
  { value: "sim-warm", label: "Warm and friendly" },
  { value: "sim-calm", label: "Calm and professional" },
  { value: "sim-bright", label: "Bright and energetic" },
] as const;

export const ALLOWED_ACTIONS = [
  { value: "book_appointment", label: "Book an appointment" },
  { value: "schedule_callback", label: "Schedule a callback" },
  { value: "transfer_to_human", label: "Transfer to a human" },
  { value: "send_message", label: "Send a follow-up message" },
] as const;

export type CaptureField = { label: string; required: boolean };

export type EmployeeFormValues = {
  name: string;
  purpose: string;
  objective: string;
  calling_mode: (typeof CALLING_MODES)[number];
  voice: string;
  language: string;
  greeting: string;
  system_prompt: string;
  qualification_questions: string[];
  capture_fields: CaptureField[];
  allowed_actions: string[];
};

export const emptyEmployee: EmployeeFormValues = {
  name: "",
  purpose: "",
  objective: "",
  calling_mode: "outbound",
  voice: "sim-warm",
  language: "en-IN",
  greeting: "",
  system_prompt: "",
  qualification_questions: [],
  capture_fields: [{ label: "Full name", required: true }],
  allowed_actions: [],
};

export const employeeSchema: Yup.ObjectSchema<EmployeeFormValues> = Yup.object({
  name: Yup.string().trim().min(2, "Name must be at least 2 characters").max(80, "Keep the name under 80 characters").required("Give your employee a name"),
  purpose: Yup.string().trim().max(300, "Keep the purpose under 300 characters").default(""),
  objective: Yup.string().trim().min(5, "Describe the main goal of each call").max(300).required("Describe the main goal of each call"),
  calling_mode: Yup.mixed<(typeof CALLING_MODES)[number]>().oneOf([...CALLING_MODES]).required(),
  voice: Yup.string().required("Choose a voice"),
  language: Yup.string().oneOf(LANGUAGES.map((l) => l.value), "Choose a supported language").required("Choose a language"),
  greeting: Yup.string().trim().min(5, "Write the opening line the employee will say").max(500).required("Write the opening line the employee will say"),
  system_prompt: Yup.string().trim().min(20, "Give at least a couple of sentences of instructions").max(8000).required("Give at least a couple of sentences of instructions"),
  qualification_questions: Yup.array(Yup.string().trim().min(3, "Questions need at least 3 characters").max(300).required("Fill in or remove this question")).max(15, "Use at most 15 questions").required(),
  capture_fields: Yup.array(
    Yup.object({
      label: Yup.string().trim().min(2, "Label is too short").max(60).required("Name this field"),
      required: Yup.boolean().required(),
    }),
  ).max(20, "Use at most 20 fields").required(),
  allowed_actions: Yup.array(Yup.string().oneOf(ALLOWED_ACTIONS.map((a) => a.value)).required()).required(),
});
