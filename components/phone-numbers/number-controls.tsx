"use client";

import { useState } from "react";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Select } from "@/components/ui/field";
import { SimpleForm } from "@/components/ui/simple-form";
import { addPhoneNumber, assignNumber } from "@/app/(app)/phone-numbers/actions";
import { phoneSchema } from "@/lib/validations/common";

export function AddNumberForm() {
  return (
    <SimpleForm columns={2} resetOnSuccess submitLabel="Save number" busyLabel="Saving…"
      initial={{ e164: "", label: "" }}
      schema={Yup.object({ e164: phoneSchema, label: Yup.string().max(60) })}
      onSubmit={addPhoneNumber}
      fields={[
        { name: "e164", label: "Phone number", type: "tel", placeholder: "+911234567890", hint: "Enter a number you already own. Nothing is purchased." },
        { name: "label", label: "Label (optional)" },
      ]}
    />
  );
}

export function AssignSelect({ numberId, employeeId, employees }: { numberId: string; employeeId: string; employees: { id: string; name: string }[] }) {
  const router = useRouter();
  const [value, setValue] = useState(employeeId);
  return (
    <Select aria-label="Assigned employee" className="h-9 min-w-44" value={value}
      onChange={async (e) => {
        const next = e.target.value;
        const r = await assignNumber(numberId, next);
        if (!r.ok) return void toast.error(r.error);
        setValue(next);
        toast.success(r.message ?? "Updated.");
        router.refresh();
      }}>
      <option value="">Unassigned</option>
      {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
    </Select>
  );
}
