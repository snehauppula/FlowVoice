"use client";

import { useState } from "react";
import { useFormik, type FormikErrors } from "formik";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/page";
import { saveEmployee } from "@/app/(app)/employees/actions";
import {
  ALLOWED_ACTIONS, CALLING_MODES, LANGUAGES, VOICES, employeeSchema,
  type EmployeeFormValues,
} from "@/lib/validations/employee";
import { cn } from "@/lib/utils";

const STEPS: { title: string; fields: (keyof EmployeeFormValues)[] }[] = [
  { title: "Basics", fields: ["name", "purpose"] },
  { title: "Objective", fields: ["objective", "calling_mode"] },
  { title: "Voice", fields: ["voice", "language"] },
  { title: "Script", fields: ["greeting", "system_prompt"] },
  { title: "Questions", fields: ["qualification_questions"] },
  { title: "Data to capture", fields: ["capture_fields"] },
  { title: "Actions", fields: ["allowed_actions"] },
  { title: "Review", fields: [] },
];

const MODE_LABEL: Record<string, string> = {
  outbound: "Outbound — calls leads",
  inbound: "Inbound — answers calls",
  both: "Both directions",
};

export function EmployeeWizard({
  employeeId,
  initial,
}: {
  employeeId: string | null;
  initial: EmployeeFormValues;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);

  const formik = useFormik<EmployeeFormValues>({
    initialValues: initial,
    validationSchema: employeeSchema,
    onSubmit: () => {},
  });
  const { values, errors, touched, setFieldValue, getFieldProps } = formik;

  const err = (k: keyof EmployeeFormValues) =>
    touched[k] && typeof errors[k] === "string" ? (errors[k] as string) : undefined;

  async function validateStep(index: number) {
    const all = await formik.validateForm();
    const fields = STEPS[index].fields;
    const bad = fields.filter((f) => all[f]);
    if (bad.length) {
      formik.setTouched(Object.fromEntries(fields.map((f) => [f, true])), false);
      toast.error("Please fix the highlighted fields to continue.");
      return false;
    }
    return true;
  }

  async function next() {
    if (await validateStep(step)) setStep(step + 1);
  }

  async function submit(publish: boolean) {
    const all: FormikErrors<EmployeeFormValues> = await formik.validateForm();
    const firstBad = STEPS.findIndex((s) => s.fields.some((f) => all[f]));
    if (firstBad !== -1) {
      setStep(firstBad);
      formik.setTouched(Object.fromEntries(STEPS[firstBad].fields.map((f) => [f, true])), false);
      return void toast.error(`Step "${STEPS[firstBad].title}" needs attention.`);
    }
    setBusy(publish ? "publish" : "save");
    const result = await saveEmployee(employeeId, values, publish);
    setBusy(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(publish ? "Employee published." : "Draft saved.");
    router.push(`/employees/${result.id}`);
    router.refresh();
  }

  const last = step === STEPS.length - 1;

  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-1.5" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={async () => (i <= step || (await validateStep(step))) && setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "chip",
                i === step && "chip-active",
                i < step && "border-primary/40 text-primary-hover",
              )}
            >
              {i + 1}. {s.title}
            </button>
          </li>
        ))}
      </ol>

      <Card className="space-y-4 p-4 sm:p-6">
        {step === 0 && (
          <>
            <Field label="Employee name" htmlFor="name" error={err("name")}>
              <Input id="name" placeholder="e.g. Riya from Sales" {...getFieldProps("name")} />
            </Field>
            <Field label="What does this employee do?" htmlFor="purpose" error={err("purpose")} hint="Optional. Shown in your employee list.">
              <Textarea id="purpose" {...getFieldProps("purpose")} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Primary calling objective" htmlFor="objective" error={err("objective")} hint="What counts as a successful call?">
              <Textarea id="objective" placeholder="Qualify the lead and book a demo" {...getFieldProps("objective")} />
            </Field>
            <Field label="Calling mode" htmlFor="calling_mode" error={err("calling_mode")}>
              <Select id="calling_mode" {...getFieldProps("calling_mode")}>
                {CALLING_MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
              </Select>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Voice" htmlFor="voice" error={err("voice")} hint="Voice styles apply to the simulated engine. Real voices depend on the speech provider you connect later.">
              <Select id="voice" {...getFieldProps("voice")}>
                {VOICES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label="Language" htmlFor="language" error={err("language")}>
              <Select id="language" {...getFieldProps("language")}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </Select>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Greeting" htmlFor="greeting" error={err("greeting")} hint="The first thing the employee says.">
              <Textarea id="greeting" {...getFieldProps("greeting")} />
            </Field>
            <Field label="Instructions" htmlFor="system_prompt" error={err("system_prompt")} hint="Tone, rules, what to avoid, and how to handle objections.">
              <Textarea id="system_prompt" className="min-h-40" {...getFieldProps("system_prompt")} />
            </Field>
          </>
        )}

        {step === 4 && (
          <ListEditor
            title="Qualification questions"
            empty="No questions yet. Add the questions the employee should ask."
            addLabel="Add question"
            items={values.qualification_questions}
            errorFor={(i) => (touched.qualification_questions ? (errors.qualification_questions as string[] | undefined)?.[i] : undefined)}
            onChange={(next) => setFieldValue("qualification_questions", next)}
            makeItem={() => ""}
            render={(item, i, set) => (
              <Input aria-label={`Question ${i + 1}`} value={item} onChange={(e) => set(e.target.value)} />
            )}
            listError={err("qualification_questions")}
          />
        )}

        {step === 5 && (
          <ListEditor
            title="Data to capture"
            empty="No fields yet. Add what the employee should record on each call."
            addLabel="Add field"
            items={values.capture_fields}
            errorFor={(i) => {
              const e = (touched.capture_fields ? errors.capture_fields : undefined) as FormikErrors<{ label: string }>[] | undefined;
              return e?.[i]?.label;
            }}
            onChange={(next) => setFieldValue("capture_fields", next)}
            makeItem={() => ({ label: "", required: false })}
            render={(item, i, set) => (
              <div className="flex flex-1 items-center gap-3">
                <Input aria-label={`Field ${i + 1}`} value={item.label} onChange={(e) => set({ ...item, label: e.target.value })} />
                <label className="flex shrink-0 items-center gap-1.5">
                  <input type="checkbox" checked={item.required} onChange={(e) => set({ ...item, required: e.target.checked })} />
                  Required
                </label>
              </div>
            )}
            listError={err("capture_fields")}
          />
        )}

        {step === 6 && (
          <fieldset className="space-y-3">
            <legend className="font-semibold">Allowed actions</legend>
            <p className="text-muted">
              Only enabled actions can be used during a call. Actions that need an integration (calendar, messaging) stay inactive until one is connected.
            </p>
            {ALLOWED_ACTIONS.map((a) => (
              <label key={a.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values.allowed_actions.includes(a.value)}
                  onChange={(e) =>
                    setFieldValue(
                      "allowed_actions",
                      e.target.checked ? [...values.allowed_actions, a.value] : values.allowed_actions.filter((x) => x !== a.value),
                    )
                  }
                />
                {a.label}
              </label>
            ))}
            <p className="text-muted">Knowledge sources are added under Train Employees after you save.</p>
          </fieldset>
        )}

        {step === 7 && <Review values={values} />}
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" disabled={step === 0 || busy !== null} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        {last ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => submit(false)}>
              {busy === "save" ? "Saving…" : "Save as draft"}
            </Button>
            <Button type="button" disabled={busy !== null} onClick={() => submit(true)}>
              {busy === "publish" ? "Publishing…" : "Save and publish"}
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={next}>Next</Button>
        )}
      </div>
    </div>
  );
}

function ListEditor<T>({
  title, empty, addLabel, items, onChange, makeItem, render, errorFor, listError,
}: {
  title: string;
  empty: string;
  addLabel: string;
  items: T[];
  onChange: (next: T[]) => void;
  makeItem: () => T;
  render: (item: T, index: number, set: (v: T) => void) => React.ReactNode;
  errorFor: (index: number) => string | undefined;
  listError?: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-base">{title}</h2>
      {items.length === 0 && <p className="text-muted">{empty}</p>}
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2">
            {render(item, i, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}
            <button type="button" aria-label={`Remove ${i + 1}`} className="rounded-md p-2 hover:bg-accent-soft" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 size={16} />
            </button>
          </div>
          {errorFor(i) && <p role="alert" className="text-danger">{errorFor(i)}</p>}
        </div>
      ))}
      {listError && <p role="alert" className="text-danger">{listError}</p>}
      <Button type="button" variant="outline" onClick={() => onChange([...items, makeItem()])}>
        <Plus size={16} /> {addLabel}
      </Button>
    </div>
  );
}

function Review({ values }: { values: EmployeeFormValues }) {
  const rows: [string, string][] = [
    ["Name", values.name],
    ["Objective", values.objective],
    ["Mode", MODE_LABEL[values.calling_mode]],
    ["Voice", VOICES.find((v) => v.value === values.voice)?.label ?? values.voice],
    ["Language", LANGUAGES.find((l) => l.value === values.language)?.label ?? values.language],
    ["Greeting", values.greeting],
    ["Questions", String(values.qualification_questions.length)],
    ["Fields to capture", values.capture_fields.map((f) => f.label).join(", ") || "None"],
    ["Actions", values.allowed_actions.join(", ") || "None"],
  ];
  return (
    <div>
      <h2 className="mb-3 text-base">Review</h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[160px_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-muted">
        Publishing creates a new version and activates the employee. Test calls are simulated until a telephony provider is connected.
      </p>
    </div>
  );
}
