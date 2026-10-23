"use client";

import { useFormik } from "formik";
import type * as Yup from "yup";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "./button";
import { Field, Input, Select, Textarea } from "./field";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "time" | "textarea" | "select" | "checkbox" | "url";
  options?: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
};

export type FormResult = { ok: true; message?: string; data?: unknown } | { ok: false; error: string };

type Values = Record<string, string | number | boolean>;

export function SimpleForm({
  fields, initial, schema, submitLabel, busyLabel = "Saving…", successMessage = "Saved.", onSubmit, onSuccess, resetOnSuccess = false, columns = 1,
}: {
  fields: FieldDef[];
  initial: Values;
  schema: Yup.AnyObjectSchema;
  submitLabel: string;
  busyLabel?: string;
  successMessage?: string;
  onSubmit: (values: Values) => Promise<FormResult>;
  onSuccess?: (data: unknown) => void;
  resetOnSuccess?: boolean;
  columns?: 1 | 2;
}) {
  const router = useRouter();
  const formik = useFormik<Values>({
    initialValues: initial,
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      const r = await onSubmit(values);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? successMessage);
      if (resetOnSuccess) helpers.resetForm();
      onSuccess?.(r.data);
      router.refresh();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
      <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
        {fields.map((f) => {
          const err = formik.touched[f.name] ? (formik.errors[f.name] as string | undefined) : undefined;
          const props = formik.getFieldProps(f.name);
          if (f.type === "checkbox") {
            return (
              <label key={f.name} className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={Boolean(formik.values[f.name])} onChange={(e) => formik.setFieldValue(f.name, e.target.checked)} />
                {f.label}
              </label>
            );
          }
          return (
            <Field key={f.name} label={f.label} htmlFor={f.name} error={err} hint={f.hint}>
              {f.type === "textarea" ? (
                <Textarea id={f.name} placeholder={f.placeholder} {...props} value={String(props.value)} />
              ) : f.type === "select" ? (
                <Select id={f.name} {...props} value={String(props.value)}>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input id={f.name} type={f.type ?? "text"} placeholder={f.placeholder} {...props} value={String(props.value)} />
              )}
            </Field>
          );
        })}
      </div>
      <Button type="submit" disabled={formik.isSubmitting}>{formik.isSubmitting ? busyLabel : submitLabel}</Button>
    </form>
  );
}
