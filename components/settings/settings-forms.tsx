"use client";

import * as Yup from "yup";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SimpleForm } from "@/components/ui/simple-form";
import { Select } from "@/components/ui/field";
import { setMemberRole, updateOrganization, updateProfile } from "@/app/(app)/settings/actions";

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney", "UTC"];

export function OrganizationForm({ initial, disabled }: {
  initial: { name: string; timezone: string; calling_hours_start: string; calling_hours_end: string; default_max_retries: number; retention_days: number };
  disabled: boolean;
}) {
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined} aria-disabled={disabled}>
      <SimpleForm
        columns={2}
        submitLabel="Save organization"
        successMessage="Organization settings saved."
        initial={initial}
        schema={Yup.object({
          name: Yup.string().trim().min(2, "At least 2 characters").max(120).required("Required"),
          timezone: Yup.string().required(),
          calling_hours_start: Yup.string().required("Required"),
          calling_hours_end: Yup.string().required("Required"),
          default_max_retries: Yup.number().typeError("Enter a number").integer().min(0).max(10).required(),
          retention_days: Yup.number().typeError("Enter a number").integer().min(7, "At least 7 days").max(3650).required(),
        })}
        onSubmit={updateOrganization}
        fields={[
          { name: "name", label: "Organization name" },
          { name: "timezone", label: "Timezone", type: "select", options: TIMEZONES.map((t) => ({ value: t, label: t })) },
          { name: "calling_hours_start", label: "Calling hours start", type: "time" },
          { name: "calling_hours_end", label: "Calling hours end", type: "time" },
          { name: "default_max_retries", label: "Default retries per contact", type: "number" },
          { name: "retention_days", label: "Keep transcripts for (days)", type: "number", hint: "Stored preference; automatic deletion is not active yet." },
        ]}
      />
    </div>
  );
}

export function ProfileForm({ fullName }: { fullName: string }) {
  return (
    <SimpleForm
      submitLabel="Save profile"
      initial={{ full_name: fullName }}
      schema={Yup.object({ full_name: Yup.string().trim().min(2, "Enter your full name").max(100).required("Required") })}
      onSubmit={updateProfile}
      fields={[{ name: "full_name", label: "Full name" }]}
    />
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: string; disabled: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  return (
    <Select aria-label="Role" className="h-9 w-32" value={value} disabled={disabled}
      onChange={async (e) => {
        const next = e.target.value;
        const r = await setMemberRole(userId, next);
        if (!r.ok) return void toast.error(r.error);
        setValue(next);
        toast.success("Role updated.");
        router.refresh();
      }}>
      {["admin", "member", "viewer"].map((r) => <option key={r} value={r}>{r}</option>)}
    </Select>
  );
}
