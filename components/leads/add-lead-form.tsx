"use client";

import * as Yup from "yup";
import { SimpleForm } from "@/components/ui/simple-form";
import { addLead } from "@/app/(app)/leads/actions";
import { phoneSchema } from "@/lib/validations/common";

const schema = Yup.object({
  name: Yup.string().trim().max(120),
  phone: phoneSchema,
  email: Yup.string().trim().email("Enter a valid email"),
});

export function AddLeadForm() {
  return (
    <SimpleForm
      columns={2}
      resetOnSuccess
      submitLabel="Add lead"
      busyLabel="Adding…"
      initial={{ name: "", phone: "", email: "", consent_given: false }}
      schema={schema}
      onSubmit={addLead}
      fields={[
        { name: "name", label: "Name" },
        { name: "phone", label: "Phone", type: "tel", placeholder: "+919876543210" },
        { name: "email", label: "Email (optional)", type: "email" },
        { name: "consent_given", label: "This person has consented to be called", type: "checkbox" },
      ]}
    />
  );
}
