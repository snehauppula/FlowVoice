"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function OnboardingForm() {
  const router = useRouter();
  const formik = useFormik({
    initialValues: { name: "" },
    validationSchema: Yup.object({
      name: Yup.string().trim().min(2, "Use at least 2 characters").max(120).required("Organization name is required"),
    }),
    onSubmit: async ({ name }) => {
      const { error } = await createClient().rpc("create_organization", { org_name: name.trim() });
      if (error) return void toast.error("Could not create the organization. Please try again.");
      toast.success("Organization created.");
      router.replace("/dashboard");
      router.refresh();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
      <Field label="Organization name" htmlFor="name" error={formik.touched.name ? formik.errors.name : undefined}>
        <Input id="name" {...formik.getFieldProps("name")} />
      </Field>
      <Button type="submit" className="w-full" disabled={formik.isSubmitting}>
        {formik.isSubmitting ? "Creating…" : "Continue"}
      </Button>
    </form>
  );
}
