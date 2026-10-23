import type { Metadata } from "next";
import { ApiKeyForm, WebhookForm } from "@/components/developers/developer-forms";
import { ActionButton } from "@/components/ui/confirm-button";
import { Card, PageHeader } from "@/components/ui/page";
import { TableWrap, Tag, Td, Th, fmtDate } from "@/components/ui/data";
import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteWebhook, revokeApiKey } from "./actions";

export const metadata: Metadata = { title: "Developers" };

const CURL = `curl -X POST https://YOUR_APP_URL/api/v1/leads \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Asha Rao","phone":"+919876543210","email":"asha@example.com","source":"website","consent":true}'`;

export default async function DevelopersPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const canAdmin = ["owner", "admin"].includes(org.role);
  const [keys, hooks, deliveries] = canAdmin
    ? await Promise.all([
        supabase.from("api_keys").select("id, name, key_prefix, last_used_at, revoked_at, created_at").eq("organization_id", org.organizationId).order("created_at", { ascending: false }),
        supabase.from("webhook_endpoints").select("id, url, events, enabled, created_at").eq("organization_id", org.organizationId).order("created_at", { ascending: false }),
        supabase.from("webhook_deliveries").select("id, event_type, response_status, attempts, created_at").eq("organization_id", org.organizationId).order("created_at", { ascending: false }).limit(20),
      ])
    : [null, null, null];

  return (
    <>
      <PageHeader title="Developers" description="API keys, webhooks and documentation." />
      <div className="space-y-6">
        <Card className="p-4 sm:p-6">
          <h2 className="mb-2 text-base">Send leads: POST /api/v1/leads</h2>
          <p className="mb-3 text-muted">
            Authenticate with <code>Authorization: Bearer &lt;key&gt;</code>. Phone numbers must be E.164. Responses: 201 created, 409 duplicate, 401 bad key, 422 invalid input, 429 rate limited (60 requests/minute per key).
          </p>
          <pre className="overflow-x-auto rounded-xl bg-foreground p-3 text-background"><code>{CURL}</code></pre>
          <p className="mt-3 text-muted">Success: <code>{`{"id":"…"}`}</code> · Duplicate: <code>{`{"error":"duplicate_lead"}`}</code></p>
        </Card>

        {!canAdmin ? (
          <p className="text-muted">Only owners and admins can manage API keys and webhooks.</p>
        ) : (
          <>
            <Card className="p-4 sm:p-6">
              <h2 className="mb-3 text-base">API keys</h2>
              <ApiKeyForm />
              <div className="mt-4">
                {keys?.data?.length ? (
                  <TableWrap>
                    <thead><tr><Th>Name</Th><Th>Key</Th><Th>Last used</Th><Th>Status</Th><Th /></tr></thead>
                    <tbody>{keys.data.map((k) => (
                      <tr key={k.id}><Td>{k.name}</Td><Td><code>{k.key_prefix}…</code></Td>
                        <Td>{k.last_used_at ? fmtDate(k.last_used_at) : "Never"}</Td>
                        <Td>{k.revoked_at ? <Tag tone="bad">revoked</Tag> : <Tag tone="good">active</Tag>}</Td>
                        <Td>{!k.revoked_at && <ActionButton label="Revoke" busyLabel="Revoking…" confirm="Revoke this key? Anything using it will stop working." action={revokeApiKey.bind(null, k.id)} />}</Td></tr>
                    ))}</tbody>
                  </TableWrap>
                ) : <p className="text-muted">No API keys yet.</p>}
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="mb-1 text-base">Webhooks</h2>
              <p className="mb-3 rounded-md border border-border-strong bg-accent-soft p-3">
                Registration is saved, but automatic event delivery and test events are not active yet, so the delivery log below stays empty.
              </p>
              <WebhookForm />
              <div className="mt-4">
                {hooks?.data?.length ? (
                  <TableWrap>
                    <thead><tr><Th>URL</Th><Th>Events</Th><Th>Added</Th><Th /></tr></thead>
                    <tbody>{hooks.data.map((h) => (
                      <tr key={h.id}><Td className="break-all">{h.url}</Td><Td>{(h.events as string[]).join(", ")}</Td><Td>{fmtDate(h.created_at)}</Td>
                        <Td><ActionButton label="Delete" busyLabel="Deleting…" confirm="Delete this webhook?" action={deleteWebhook.bind(null, h.id)} /></Td></tr>
                    ))}</tbody>
                  </TableWrap>
                ) : <p className="text-muted">No webhooks registered.</p>}
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="mb-2 text-base">Delivery log</h2>
              {deliveries?.data?.length ? (
                <TableWrap>
                  <thead><tr><Th>When</Th><Th>Event</Th><Th>Status</Th><Th>Attempts</Th></tr></thead>
                  <tbody>{deliveries.data.map((d) => <tr key={d.id}><Td>{fmtDate(d.created_at)}</Td><Td>{d.event_type}</Td><Td>{d.response_status ?? "pending"}</Td><Td>{d.attempts}</Td></tr>)}</tbody>
                </TableWrap>
              ) : <p className="text-muted">No deliveries yet.</p>}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
