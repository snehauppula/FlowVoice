"use client";

import * as Yup from "yup";
import { SimpleForm } from "@/components/ui/simple-form";
import { simulateTopup } from "@/app/(app)/billing/actions";

export function TopupForm() {
  return (
    <SimpleForm
      submitLabel="Add simulated credits"
      busyLabel="Adding…"
      initial={{ amount: 50 }}
      schema={Yup.object({ amount: Yup.number().typeError("Enter a number").min(1, "Minimum is 1").max(100000, "Maximum is 100,000").required("Enter an amount") })}
      onSubmit={simulateTopup}
      fields={[{ name: "amount", label: "Credits", type: "number" }]}
    />
  );
}
