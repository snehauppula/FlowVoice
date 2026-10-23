"use client";

import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Card, SimulatedBadge } from "@/components/ui/page";
import { Transcript } from "./transcript";
import { startTestCall, type TalkResult } from "@/app/(app)/talk/actions";
import { phoneSchema } from "@/lib/validations/common";

const SCENARIOS = [
  { value: "qualified", label: "Answers and qualifies" },
  { value: "not_interested", label: "Answers, not interested" },
  { value: "no_answer", label: "No answer" },
  { value: "busy", label: "Line busy" },
  { value: "provider_error", label: "Provider error" },
];

export function TalkForm({
  employees,
  defaultTo = "",
}: {
  employees: { id: string; name: string; status: string }[];
  defaultTo?: string;
}) {
  const [result, setResult] = useState<Extract<TalkResult, { ok: true }> | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());

  const formik = useFormik({
    initialValues: { employeeId: employees[0]?.id ?? "", to: defaultTo, scenario: "qualified" },
    validationSchema: Yup.object({
      employeeId: Yup.string().required("Choose an employee"),
      to: phoneSchema,
    }),
    onSubmit: async (v) => {
      setResult(null);
      setFailure(null);
      const r = await startTestCall({ ...v, idempotencyKey: key });
      if (!r.ok) {
        setFailure(r.error);
        return void toast.error(r.error);
      }
      setKey(crypto.randomUUID());
      setResult(r);
      if (r.status === "completed") toast.success("Simulated call completed.");
      else toast.error(`Simulated call ended: ${r.status.replace("_", " ")}.`);
    },
  });

  const e = (k: "employeeId" | "to") => (formik.touched[k] ? formik.errors[k] : undefined);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="space-y-4 self-start p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base">Test call</h2>
          <SimulatedBadge />
        </div>
        <p className="text-muted">No real phone call is placed. The conversation is generated from your employee&apos;s configuration.</p>
        <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
          <Field label="Employee" htmlFor="employeeId" error={e("employeeId")}>
            <Select id="employeeId" {...formik.getFieldProps("employeeId")}>
              {employees.map((x) => (
                <option key={x.id} value={x.id}>{x.name} ({x.status})</option>
              ))}
            </Select>
          </Field>
          <Field label="Destination number" htmlFor="to" error={e("to")} hint="International format.">
            <Input id="to" inputMode="tel" placeholder="+919876543210" {...formik.getFieldProps("to")} />
          </Field>
          <Field label="Simulated outcome" htmlFor="scenario">
            <Select id="scenario" {...formik.getFieldProps("scenario")}>
              {SCENARIOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
          <Button type="submit" className="w-full" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? "Calling…" : "Start simulated call"}
          </Button>
        </form>
      </Card>

      <Card className="min-h-48 p-4 sm:p-6" aria-live="polite">
        {!result && !failure && <p className="text-muted">The call result, transcript and summary will appear here.</p>}
        {failure && (
          <div className="space-y-3">
            <p role="alert" className="text-danger">{failure}</p>
            <Button variant="outline" onClick={() => formik.submitForm()}>Retry</Button>
          </div>
        )}
        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base capitalize">{result.status.replace("_", " ")}</h2>
              <SimulatedBadge />
              <Link href={`/conversations/${result.callId}`} className="ml-auto underline">Open call record</Link>
            </div>
            {result.result?.error && <p role="alert" className="text-danger">{result.result.error}</p>}
            {result.result?.summary && (
              <div>
                <p className="font-semibold">Summary</p>
                <p>{result.result.summary}</p>
              </div>
            )}
            {result.result && result.result.transcript.length > 0 && <Transcript turns={result.result.transcript} />}
            {result.status !== "completed" && (
              <Button variant="outline" onClick={() => formik.submitForm()} disabled={formik.isSubmitting}>Retry call</Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
