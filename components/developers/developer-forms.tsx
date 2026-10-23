"use client";

import { useState } from "react";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { SimpleForm } from "@/components/ui/simple-form";
import { createApiKey, createWebhook } from "@/app/(app)/developers/actions";
import { WEBHOOK_EVENTS } from "@/lib/validations/developers";

function SecretOnce({ secret, onDone }: { secret: string; onDone: () => void }) {
  return (
    <div role="status" className="space-y-2 rounded-md border border-border-strong bg-accent-soft p-3">
      <p className="font-semibold">Copy this now. It will not be shown again.</p>
      <code className="block break-all rounded-md bg-surface p-2">{secret}</code>
      <div className="flex gap-2">
        <Button variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(secret); toast.success("Copied."); } catch { toast.error("Couldn't copy; select and copy it manually."); }
        }}>Copy</Button>
        <Button variant="ghost" onClick={onDone}>I&apos;ve saved it</Button>
      </div>
    </div>
  );
}

export function ApiKeyForm() {
  const [secret, setSecret] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {secret && <SecretOnce secret={secret} onDone={() => setSecret(null)} />}
      <SimpleForm
        submitLabel="Create key" busyLabel="Creating…" resetOnSuccess initial={{ name: "" }}
        schema={Yup.object({ name: Yup.string().trim().min(2, "At least 2 characters").max(60).required("Name the key") })}
        onSubmit={createApiKey}
        onSuccess={(d) => setSecret((d as { secret: string }).secret)}
        fields={[{ name: "name", label: "Key name", placeholder: "e.g. Website form" }]}
      />
    </div>
  );
}

export function WebhookForm() {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>(["call.completed"]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {secret && <SecretOnce secret={secret} onDone={() => setSecret(null)} />}
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        const r = await createWebhook({ url, events });
        setBusy(false);
        if (!r.ok) { setError(r.error); return void toast.error(r.error); }
        toast.success("Webhook registered.");
        setSecret((r.data as { secret: string }).secret);
        setUrl("");
        router.refresh();
      }}>
        <div className="space-y-1.5">
          <label htmlFor="wh-url" className="text-sm font-semibold">Endpoint URL</label>
          <input id="wh-url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/flowvoice"
            className="h-10 w-full rounded-md border border-border-strong bg-surface px-3" />
        </div>
        <fieldset className="space-y-1">
          <legend className="font-semibold">Events</legend>
          {WEBHOOK_EVENTS.map((ev) => (
            <label key={ev} className="flex items-center gap-2">
              <input type="checkbox" checked={events.includes(ev)} onChange={(e) => setEvents(e.target.checked ? [...events, ev] : events.filter((x) => x !== ev))} />
              {ev}
            </label>
          ))}
        </fieldset>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Registering…" : "Register webhook"}</Button>
      </form>
    </div>
  );
}
