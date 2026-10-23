"use client";

import * as Yup from "yup";
import { SimpleForm } from "@/components/ui/simple-form";
import { addKnowledge } from "@/app/(app)/train/actions";

export function KnowledgeForm({ employeeId }: { employeeId: string }) {
  return (
    <SimpleForm
      resetOnSuccess submitLabel="Add entry" busyLabel="Saving…"
      initial={{ employee_id: employeeId, kind: "faq", title: "", content: "" }}
      schema={Yup.object({
        title: Yup.string().trim().min(2, "Give it a title").max(120).required("Give it a title"),
        content: Yup.string().trim().min(5, "Add some content").max(20000).required("Add some content"),
      })}
      onSubmit={addKnowledge}
      fields={[
        { name: "kind", label: "Type", type: "select", options: [{ value: "faq", label: "FAQ / structured answer" }, { value: "text", label: "Text note" }, { value: "website", label: "Website URL" }] },
        { name: "title", label: "Title", placeholder: "e.g. Refund policy" },
        { name: "content", label: "Content or URL", type: "textarea", hint: "For websites, paste the page URL." },
      ]}
    />
  );
}
